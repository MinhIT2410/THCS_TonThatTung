import asyncio
import hashlib
import logging
import time
from datetime import datetime, timezone
from typing import List, Optional

from app.models.schemas import (
    AnalyzeResponse,
    MarketScanResult,
    ReadyAlert,
    ReadyScannerResponse,
    ScannerResponse,
    V2ContextModel,
)
from app.services.analyzer import analyze_symbol_all_timeframes
from app.services.outcome_tracker import track_open_outcomes
from app.services.signal_history import persist_v2_ready_signal
from app.services.supabase_client import get_active_admin_user_id, db_get_prop_risk_profile, db_get_prop_daily_state
from app.services.risk_safety import evaluate_prop_risk, format_risk_telegram
from app.services.autotrade_service import evaluate_and_execute_demo_autotrade

logger = logging.getLogger(__name__)

# Legacy compatibility only. Runtime V4 scanner symbols are resolved dynamically
# from the active watchlist via get_default_watchlist_symbols().
SCANNER_SYMBOLS = (
    "BTCUSDT",
    "ETHUSDT",
    "BNBUSDT",
    "SOLUSDT",
    "XAUUSDT",
    "XAGUSDT",
)


async def get_default_watchlist_symbols(user_id: Optional[str] = None) -> List[str]:
    """
    Dynamically resolve active enabled symbols from database/mock watchlist.
    Falls back to default SCANNER_SYMBOLS if watchlist is empty or DB query fails.
    """
    from app.services.supabase_client import get_active_admin_user_id, db_get_watchlist
    target_uid = user_id
    if not target_uid:
        try:
            target_uid = await get_active_admin_user_id()
        except Exception:
            target_uid = None

    if target_uid:
        try:
            watchlist = await db_get_watchlist(target_uid)
            enabled = [item["symbol"] for item in watchlist if isinstance(item, dict) and item.get("is_enabled", True)]
            if enabled:
                return enabled
        except Exception as e:
            logger.warning(f"Error fetching dynamic watchlist symbols: {e}")

    return list(SCANNER_SYMBOLS)


def create_alert_id(
    setup_context_id: str,
    side: str,
    entry: float,
    stop_loss: float,
    take_profit: float,
) -> str:
    """
    Deterministic alert ID generation:
    alert_id = setup_context_id + side + entry + stop_loss + take_profit
    """
    return f"{setup_context_id}_{side}_{entry}_{stop_loss}_{take_profit}"




def create_v4_setup_alert_id(setup_context_id: str, side: str) -> str:
    """Stable V4 alert ID: one READY notification/execution key per setup + side."""
    raw = f"{setup_context_id}|{side}"
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:20]
    return f"v4alert_{digest}"


def get_trade_signal_available_time_ms(final_plan, continuation=None) -> Optional[int]:
    """Return when the selected M5/M1 entry candle became knowable (its close)."""
    entry_time = getattr(final_plan, "entry_time", None)
    if entry_time is not None:
        timeframe_ms = 60_000 if getattr(final_plan, "m1_refined", False) else 300_000
        return int(entry_time) + timeframe_ms - 1

    confirmation_time = getattr(continuation, "confirmation_time", None) if continuation else None
    if confirmation_time is not None:
        return int(confirmation_time) + 300_000 - 1
    return None

def create_message_text(
    symbol: str,
    side: str,
    entry: float,
    stop_loss: float,
    take_profit: float,
    rr: float,
    volume_confirmation: Optional[str],
) -> str:
    """Legacy compact alert formatter kept for V1 compatibility."""
    vol_str = volume_confirmation if volume_confirmation else "N/A"
    return (
        f"{symbol} | {side} | Entry {entry} | SL {stop_loss} | TP {take_profit} | "
        f"RR 1:{rr} | Volume {vol_str}"
    )


def _format_signal_time_utc(timestamp_ms: Optional[int]) -> str:
    if not timestamp_ms:
        return "N/A"
    try:
        dt = datetime.fromtimestamp(timestamp_ms / 1000, tz=timezone.utc)
        return dt.strftime("%Y-%m-%d %H:%M UTC")
    except (TypeError, ValueError, OSError):
        return "N/A"


def _format_entry_mode(entry_mode: Optional[str]) -> str:
    if entry_mode == "ENTRY_RETEST":
        return "RETEST"
    if entry_mode == "ENTRY_CONFIRMATION":
        return "CONFIRMATION"
    return entry_mode or "N/A"


def create_manual_trade_message(
    *,
    symbol: str,
    side: str,
    entry: float,
    stop_loss: float,
    take_profit: float,
    rr: float,
    h4_bias: Optional[str] = None,
    h1_bias: Optional[str] = None,
    zone_timeframe: Optional[str] = None,
    zone_type: Optional[str] = None,
    zone_low: Optional[float] = None,
    zone_high: Optional[float] = None,
    zone_status: Optional[str] = None,
    fib_quality: Optional[str] = None,
    weakening_score: Optional[float] = None,
    continuation_confirmed: bool = False,
    entry_mode: Optional[str] = None,
    signal_time_ms: Optional[int] = None,
    m1_refined: bool = False,
    m1_ref_price: Optional[float] = None,
    reasons: Optional[List[str]] = None,
) -> str:
    """V4.01 Telegram message displaying H1 bias, M15 zone, M5 continuation, M1 refinement."""
    bias_label = "H1 Bias" if h1_bias is not None else "H4 Bias"
    effective_bias = h1_bias if h1_bias is not None else (h4_bias or "N/A")
    z_tf = zone_timeframe or ("H1" if h1_bias is None else "M15")
    reaction_tf = "M5" if h1_bias is not None else "M15"
    zone_text = "N/A"
    if zone_low is not None and zone_high is not None:
        zone_text = f"{zone_type or 'ZONE'} {zone_low:g}-{zone_high:g}"
        if zone_status:
            zone_text += f" ({zone_status})"

    confirmation_text = "CONTINUATION_CONFIRMED" if continuation_confirmed else "CONFIRMED"
    weakening_text = f"{weakening_score:g}/5" if weakening_score is not None else "N/A"
    reason_items = [r.strip() for r in (reasons or []) if isinstance(r, str) and r.strip()]
    reason_text = "; ".join(reason_items[:2]) if reason_items else "Price Action setup hợp lệ"

    m1_text = ""
    if m1_refined:
        ref_p_str = f" @ {m1_ref_price:g}" if m1_ref_price is not None else ""
        m1_text = f" | M1 Refined{ref_p_str}"

    return (
        "📊 PRICE ACTION READY\n"
        f"{symbol} | {side}\n"
        f"⏱ Signal: {_format_signal_time_utc(signal_time_ms)}\n"
        f"{bias_label}: {effective_bias}\n"
        f"{z_tf} Zone: {zone_text}\n"
        f"{reaction_tf}: {confirmation_text} | Weakening {weakening_text} | Fib {fib_quality or 'N/A'}\n"
        f"Entry: {entry:g} ({_format_entry_mode(entry_mode)}){m1_text}\n"
        f"SL: {stop_loss:g} | TP: {take_profit:g}\n"
        f"RR: 1:{rr:g}\n"
        f"Lý do: {reason_text}\n"
        "⚠️ Trade thủ công: mở chart broker/quỹ, đối chiếu giá và cấu trúc trước khi đặt lệnh."
    )


async def run_scanner(
    symbols: Optional[List[str]] = None,
    limit: int = 500,
) -> ScannerResponse:
    """
    Run parallel multi-timeframe analysis across dynamic watchlist symbols.
    Individual symbol failures return status="ERROR" without failing the overall scan.
    """
    if symbols is None:
        target_symbols = await get_default_watchlist_symbols()
    else:
        target_symbols = symbols

    if not target_symbols:
        return ScannerResponse(updated_at=int(time.time() * 1000), markets=[])

    tasks = [
        analyze_symbol_all_timeframes(symbol=sym, limit=limit)
        for sym in target_symbols
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    market_results: List[MarketScanResult] = []

    for sym, res in zip(target_symbols, results):
        if isinstance(res, Exception):
            market_results.append(
                MarketScanResult(
                    symbol=sym,
                    status="ERROR",
                    error=str(res),
                )
            )
        else:
            analyze_res: AnalyzeResponse = res

            timeframes_map = getattr(analyze_res, "timeframes", None)
            h1_tf = timeframes_map.get("1h") if timeframes_map else None
            h4_tf = timeframes_map.get("4h") if timeframes_map else None
            h1_bias = h1_tf.trend if h1_tf else None
            h4_bias = h4_tf.trend if h4_tf else None

            h1_location = (
                analyze_res.location.state
                if analyze_res.location
                else None
            )

            setup_state = analyze_res.setup.state if analyze_res.setup else "NO_SETUP"
            side = analyze_res.setup.side if analyze_res.setup else None
            vol_conf = analyze_res.setup.volume_confirmation if analyze_res.setup else None

            current_price = analyze_res.location.current_price if analyze_res.location else None
            tp_state = analyze_res.trade_plan.state if analyze_res.trade_plan else None
            entry = analyze_res.trade_plan.entry if analyze_res.trade_plan else None
            sl = analyze_res.trade_plan.stop_loss if analyze_res.trade_plan else None
            tp = analyze_res.trade_plan.take_profit if analyze_res.trade_plan else None
            rr = analyze_res.trade_plan.rr if analyze_res.trade_plan else None
            ctx_id = analyze_res.setup.setup_context_id if analyze_res.setup else None

            v2_ctx = getattr(analyze_res, "v2_context", None)
            if not isinstance(v2_ctx, V2ContextModel):
                v2_ctx = None

            zone_type = v2_ctx.zone.zone_type if (v2_ctx and v2_ctx.zone) else None
            zone_status = v2_ctx.zone.status if (v2_ctx and v2_ctx.zone) else None
            fib_retrace = v2_ctx.fibonacci.retracement_ratio if (v2_ctx and v2_ctx.fibonacci) else None
            fib_qual = v2_ctx.fibonacci.quality if (v2_ctx and v2_ctx.fibonacci) else None

            v2_setup = v2_ctx.v2_setup if (v2_ctx and v2_ctx.v2_setup) else None
            raw_v2_state = v2_setup.state if v2_setup else "NO_SETUP"
            reaction_state = v2_ctx.reaction.state if (v2_ctx and v2_ctx.reaction) else None
            m5_conf = (
                "CONFIRMED"
                if (v2_ctx and v2_ctx.reaction and v2_ctx.reaction.continuation and v2_ctx.reaction.continuation.detected)
                else "WAITING"
            )
            v2_trade_plan = v2_setup.trade_plan if v2_setup else None
            v4_final_plan = v2_trade_plan.final_plan if v2_trade_plan else None

            expected_side = (
                "LONG" if h1_bias == "BULLISH" else
                "SHORT" if h1_bias == "BEARISH" else
                None
            )
            setup_side = v2_setup.side if v2_setup else None
            side_aligned = bool(expected_side and setup_side == expected_side)
            final_plan_valid = bool(
                v4_final_plan is not None
                and v4_final_plan.status == "VALID"
                and v4_final_plan.rr is not None
                and float(v4_final_plan.rr) >= 2.0
                and v4_final_plan.side == expected_side
            )
            v2_ready = bool(
                v2_setup is not None
                and v2_setup.ready
                and raw_v2_state == "READY"
                and side_aligned
                and final_plan_valid
            )

            if raw_v2_state == "READY" and not v2_ready:
                if not side_aligned:
                    v2_state = "NO_SETUP"
                elif v4_final_plan is not None:
                    v2_state = v4_final_plan.status
                else:
                    v2_state = "CONTINUATION_CONFIRMED"
            else:
                v2_state = raw_v2_state

            actionable_plan_stage = v2_state in {
                "READY", "WAIT_ENTRY", "REJECTED_RR", "NO_VALID_TARGET", "ENTRY_MISSED"
            }
            v4_side = setup_side if side_aligned else None
            v4_plan_state = v4_final_plan.status if (v4_final_plan is not None and actionable_plan_stage) else None
            v4_entry = v4_final_plan.entry if (v4_final_plan is not None and actionable_plan_stage) else None
            v4_sl = v4_final_plan.sl if (v4_final_plan is not None and actionable_plan_stage) else None
            v4_tp = v4_final_plan.tp if (v4_final_plan is not None and actionable_plan_stage) else None
            v4_rr = v4_final_plan.rr if (v4_final_plan is not None and actionable_plan_stage) else None
            v4_ctx_id = v2_setup.setup_context_id if v2_setup else ctx_id

            m1_refined = False
            m1_entry = None
            if v4_final_plan is not None and actionable_plan_stage:
                m1_refined = getattr(v4_final_plan, "m1_refined", False)
                if m1_refined:
                    m1_entry = v4_final_plan.entry

            market_results.append(
                MarketScanResult(
                    symbol=sym,
                    h1_bias=h1_bias,
                    h4_bias=h4_bias,
                    h1_location=h1_location,
                    setup_state=setup_state,
                    side=v4_side,
                    volume_confirmation=vol_conf,
                    trade_plan_state=v4_plan_state,
                    current_price=current_price,
                    entry=v4_entry,
                    stop_loss=v4_sl,
                    take_profit=v4_tp,
                    rr=v4_rr,
                    setup_context_id=v4_ctx_id,
                    v2_context=v2_ctx,
                    zone_type=zone_type,
                    zone_status=zone_status,
                    fib_retracement=fib_retrace,
                    fib_quality=fib_qual,
                    v2_state=v2_state,
                    reaction_state=reaction_state,
                    m5_confirmation=m5_conf,
                    m1_entry=m1_entry,
                    m1_refined=m1_refined,
                    v2_trade_plan=v2_trade_plan,
                    v2_ready=v2_ready,
                    status="OK",
                    error=None,
                )
            )


    updated_at = int(time.time() * 1000)
    return ScannerResponse(updated_at=updated_at, markets=market_results)


async def get_ready_alerts(
    symbols: Optional[List[str]] = None,
    limit: int = 500,
) -> ReadyScannerResponse:
    """
    Run scanner and filter only actionable signals:
    - setup.state == "READY"
    - trade_plan.state == "VALID"
    - trade_plan.rr >= 2.0
    """
    if symbols is None:
        target_symbols = await get_default_watchlist_symbols()
    else:
        target_symbols = symbols

    if not target_symbols:
        return ReadyScannerResponse(
            updated_at=int(time.time() * 1000),
            count=0,
            alerts=[],
        )

    tasks = [
        analyze_symbol_all_timeframes(symbol=sym, limit=limit)
        for sym in target_symbols
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    alerts: List[ReadyAlert] = []

    for sym, res in zip(target_symbols, results):
        if isinstance(res, Exception):
            continue

        analyze_res: AnalyzeResponse = res
        setup = analyze_res.setup
        plan = analyze_res.trade_plan

        if (
            setup is not None
            and setup.state == "READY"
            and plan is not None
            and plan.state == "VALID"
            and plan.rr is not None
            and plan.rr >= 2.0
            and plan.entry is not None
            and plan.stop_loss is not None
            and plan.take_profit is not None
            and setup.setup_context_id is not None
        ):
            side = plan.side or setup.side or "LONG"

            alert_id = create_alert_id(
                setup_context_id=setup.setup_context_id,
                side=side,
                entry=plan.entry,
                stop_loss=plan.stop_loss,
                take_profit=plan.take_profit,
            )

            msg_text = create_message_text(
                symbol=sym,
                side=side,
                entry=plan.entry,
                stop_loss=plan.stop_loss,
                take_profit=plan.take_profit,
                rr=plan.rr,
                volume_confirmation=setup.volume_confirmation,
            )

            alerts.append(
                ReadyAlert(
                    symbol=sym,
                    side=side,
                    entry=plan.entry,
                    stop_loss=plan.stop_loss,
                    take_profit=plan.take_profit,
                    rr=plan.rr,
                    volume_confirmation=setup.volume_confirmation,
                    setup_context_id=setup.setup_context_id,
                    alert_id=alert_id,
                    confirmation_event=setup.confirmation_event,
                    liquidity_sweep=setup.liquidity_sweep,
                    message_text=msg_text,
                )
            )

    updated_at = int(time.time() * 1000)
    return ReadyScannerResponse(
        updated_at=updated_at,
        count=len(alerts),
        alerts=alerts,
    )


async def get_v2_ready_alerts(
    symbols: Optional[List[str]] = None,
    limit: int = 500,
    user_id: Optional[str] = None,
) -> ReadyScannerResponse:
    """
    Run scanner and filter actionable V2 signals:
    - v2_ctx.v2_setup.state == "READY"
    - v2_trade_plan.final_plan.status == "VALID"
    - v2_trade_plan.final_plan.rr >= min_rr
    Persists valid READY signals and evaluates open outcomes against closed candles.
    """
    if symbols is None:
        target_symbols = await get_default_watchlist_symbols(user_id=user_id)
    else:
        target_symbols = symbols

    if not target_symbols:
        return ReadyScannerResponse(
            updated_at=int(time.time() * 1000),
            count=0,
            alerts=[],
        )

    tasks = [
        analyze_symbol_all_timeframes(symbol=sym, limit=limit)
        for sym in target_symbols
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    alerts: List[ReadyAlert] = []
    persisted_payloads = []

    for sym, res in zip(target_symbols, results):
        if isinstance(res, Exception):
            continue

        analyze_res: AnalyzeResponse = res
        v2_ctx = getattr(analyze_res, "v2_context", None)
        if not v2_ctx or not v2_ctx.v2_setup:
            continue

        v2_setup = v2_ctx.v2_setup
        if not v2_setup.ready or v2_setup.state != "READY" or not v2_setup.trade_plan:
            continue

        tp = v2_setup.trade_plan
        final_plan = tp.final_plan

        if (
            final_plan is not None
            and final_plan.status == "VALID"
            and final_plan.entry is not None
            and final_plan.sl is not None
            and final_plan.tp is not None
            and final_plan.rr is not None
        ):
            side = final_plan.side
            alert_id = create_v4_setup_alert_id(v2_setup.setup_context_id, side)

            zone = v2_ctx.zone
            reaction = v2_ctx.reaction
            continuation = reaction.continuation if reaction else None
            weakening = reaction.weakening if reaction else None
            # Freshness starts when the selected M5/M1 entry candle is CLOSED and
            # therefore knowable, not at the candle open time. For RETEST this
            # naturally uses the newer retest entry candle.
            signal_time_ms = get_trade_signal_available_time_ms(final_plan, continuation)
            if signal_time_ms is None:
                signal_time_ms = v2_setup.continuation_time
            h1_bias = (
                getattr(analyze_res.location, "h1_bias", None)
                or (analyze_res.location.bias if analyze_res.location else None)
                or (getattr(analyze_res.setup, "h1_bias", None) if analyze_res.setup else None)
            )
            timeframes_map = getattr(analyze_res, "timeframes", None)
            h4_tf = timeframes_map.get("4h") if timeframes_map else None
            h4_bias = h4_tf.trend if h4_tf else (analyze_res.setup.h4_bias if analyze_res.setup else None)

            m1_refined = getattr(final_plan, "m1_refined", False)
            m1_ref_p = getattr(final_plan, "m1_reference_price", None)

            msg_text = create_manual_trade_message(
                symbol=sym,
                side=side,
                entry=final_plan.entry,
                stop_loss=final_plan.sl,
                take_profit=final_plan.tp,
                rr=final_plan.rr,
                h4_bias=h4_bias,
                h1_bias=h1_bias,
                zone_timeframe=zone.timeframe.upper() if (zone and getattr(zone, "timeframe", None)) else "M15",
                zone_type=zone.zone_type if zone else None,
                zone_low=zone.zone_low if zone else None,
                zone_high=zone.zone_high if zone else None,
                zone_status=zone.status if zone else None,
                fib_quality=v2_ctx.fibonacci.quality if v2_ctx.fibonacci else None,
                weakening_score=weakening.score if weakening else v2_setup.weakening_score,
                continuation_confirmed=bool(continuation and continuation.detected),
                entry_mode=final_plan.entry_mode,
                signal_time_ms=signal_time_ms,
                m1_refined=m1_refined,
                m1_ref_price=m1_ref_p,
                reasons=final_plan.reasons or v2_setup.reasons,
            )

            # V3.05: append broker-neutral manual prop-risk guard when profile/state exist.
            try:
                risk_user_id = user_id or await get_active_admin_user_id()
                if risk_user_id:
                    risk_profile = await db_get_prop_risk_profile(risk_user_id)
                    risk_daily = await db_get_prop_daily_state(risk_user_id)
                    risk_result = evaluate_prop_risk(risk_profile, risk_daily)
                    msg_text += "\n" + format_risk_telegram(risk_result)
            except Exception as risk_error:
                logger.warning(f"V3.05 risk guard unavailable for {sym}: {risk_error}")

            alerts.append(
                ReadyAlert(
                    symbol=sym,
                    side=side,
                    entry=final_plan.entry,
                    stop_loss=final_plan.sl,
                    take_profit=final_plan.tp,
                    rr=final_plan.rr,
                    volume_confirmation=f"V2_{final_plan.entry_mode}",
                    setup_context_id=v2_setup.setup_context_id,
                    alert_id=alert_id,
                    message_text=msg_text,
                )
            )

            # V4.02.2: Evaluate and trigger Binance Demo AutoTrade with signal freshness check
            try:
                setup_invalidated = bool(
                    getattr(v2_setup, "invalidated", False)
                    or (getattr(v2_ctx.reaction, "invalidated", False) if v2_ctx.reaction else False)
                    or (zone and getattr(zone, "status", None) == "INVALIDATED")
                )
                await evaluate_and_execute_demo_autotrade(
                    symbol=sym,
                    side=side,
                    entry=final_plan.entry,
                    stop_loss=final_plan.sl,
                    take_profit=final_plan.tp,
                    rr=final_plan.rr,
                    h1_bias=h1_bias,
                    trade_plan_state=final_plan.status,
                    v2_setup_state=v2_setup.state,
                    setup_invalidated=setup_invalidated,
                    alert_id=alert_id,
                    setup_context_id=v2_setup.setup_context_id,
                    signal_time=signal_time_ms,
                    reasons=final_plan.reasons or v2_setup.reasons,
                )
            except Exception as auto_err:
                logger.warning(f"V4.02.2 demo autotrade execution error for {sym}: {auto_err}")

            # Build persistence payload
            target_cands = [
                tc.dict() if hasattr(tc, "dict") else tc
                for tc in (final_plan.target_candidates or [])
            ]
            persisted_payloads.append({
                "alert_id": alert_id,
                "symbol": sym,
                "side": side,
                "entry": final_plan.entry,
                "stop_loss": final_plan.sl,
                "take_profit": final_plan.tp,
                "rr": final_plan.rr,
                "min_rr": final_plan.min_rr,
                "entry_mode": final_plan.entry_mode,
                "setup_context_id": v2_setup.setup_context_id,
                "reaction_context_id": v2_setup.reaction_context_id,
                "zone_id": v2_ctx.zone.zone_id if v2_ctx.zone else None,
                "zone_type": v2_ctx.zone.zone_type if v2_ctx.zone else None,
                "fib_retracement": v2_ctx.fibonacci.retracement_ratio if v2_ctx.fibonacci else None,
                "fib_quality": v2_ctx.fibonacci.quality if v2_ctx.fibonacci else None,
                "weakening_score": v2_ctx.reaction.weakening.score if (v2_ctx.reaction and v2_ctx.reaction.weakening) else None,
                "entry_time": final_plan.entry_time,
                "entry_available_time": getattr(final_plan, "entry_available_time", None) or final_plan.entry_time,
                "continuation_time": signal_time_ms,
                "signal_time": signal_time_ms,
                "evidence": {
                    "reasons": final_plan.reasons,
                    "tp_source": final_plan.tp_source,
                    "sl_source": final_plan.sl_source,
                    "target_candidates": target_cands,
                    "h4_bias": h4_bias,
                    "zone_low": zone.zone_low if zone else None,
                    "zone_high": zone.zone_high if zone else None,
                    "zone_status": zone.status if zone else None,
                    "entry_mode": final_plan.entry_mode,
                    "manual_trade_message": msg_text,
                },
            })

    # Persist signals if user/admin available
    try:
        target_uid = user_id or await get_active_admin_user_id()
        if target_uid and persisted_payloads:
            for p in persisted_payloads:
                await persist_v2_ready_signal(user_id=target_uid, alert_payload=p)
    except Exception as persist_err:
        logger.error(f"Error persisting V2 ready signals: {persist_err}")

    # Track open outcomes
    try:
        await track_open_outcomes()
    except Exception as track_err:
        logger.error(f"Error executing outcome tracker: {track_err}")

    updated_at = int(time.time() * 1000)
    return ReadyScannerResponse(
        updated_at=updated_at,
        count=len(alerts),
        alerts=alerts,
    )
