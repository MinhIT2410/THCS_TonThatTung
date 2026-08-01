import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

function getCorsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Content-Type": "application/json",
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(origin) });
  }

  const corsHeaders = getCorsHeaders(origin);

  try {
    // 1. Authenticate caller Bearer token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: "UNAUTHORIZED",
          message: "Yêu cầu phải có Authorization Bearer Token hợp lệ.",
        }),
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.substring(7);
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: "INTERNAL_SERVER_ERROR",
          message: "Cấu hình hệ thống chưa hoàn chỉnh (Thiếu Supabase Keys).",
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    // A. User Client (caller context)
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user: callerUser }, error: authError } = await supabaseUser.auth.getUser(token);
    if (authError || !callerUser) {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: "UNAUTHORIZED",
          message: "Token xác thực không hợp lệ hoặc đã hết hạn.",
        }),
        { status: 401, headers: corsHeaders }
      );
    }

    const callerId = callerUser.id;

    // B. Parse Request Body
    const body = await req.json();
    const { user_id, target_user_id, new_password } = body;
    const targetUserId = target_user_id || user_id;

    if (!targetUserId || typeof targetUserId !== "string") {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: "VALIDATION_ERROR",
          message: "Mã người dùng (user_id) không hợp lệ.",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!new_password || typeof new_password !== "string" || new_password.trim().length < 8) {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: "VALIDATION_ERROR",
          message: "Mật khẩu mới phải có ít nhất 8 ký tự.",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // C. Admin Client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // D. Check Caller Roles
    const { data: callerRolesData } = await supabaseAdmin
      .from("user_roles")
      .select("role_code")
      .eq("user_id", callerId);

    const callerRoles = (callerRolesData || []).map((r: any) => r.role_code);
    const allowedRoles = ["SUPER_ADMIN", "PRINCIPAL", "VICE_PRINCIPAL", "STAFF"];
    const isCallerAdmin = callerRoles.some((r: string) => allowedRoles.includes(r));

    if (!isCallerAdmin) {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: "FORBIDDEN",
          message: "Bạn không có quyền thực hiện đặt lại mật khẩu cho tài khoản khác.",
        }),
        { status: 403, headers: corsHeaders }
      );
    }

    const isCallerSuperAdmin = callerRoles.includes("SUPER_ADMIN");

    // E. Check Target User Roles (Protect SUPER_ADMIN)
    const { data: targetRolesData } = await supabaseAdmin
      .from("user_roles")
      .select("role_code")
      .eq("user_id", targetUserId);

    const targetRoles = (targetRolesData || []).map((r: any) => r.role_code);
    const isTargetSuperAdmin = targetRoles.includes("SUPER_ADMIN");

    if (isTargetSuperAdmin && !isCallerSuperAdmin) {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: "FORBIDDEN",
          message: "Bạn không có quyền thay đổi mật khẩu của Quản trị viên cao cấp (SUPER_ADMIN).",
        }),
        { status: 403, headers: corsHeaders }
      );
    }

    // F. Execute Reset Password via Admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
      password: new_password.trim(),
    });

    if (updateError) {
      console.error(`auth.admin.updateUserById error for user ${targetUserId}:`, updateError);
      return new Response(
        JSON.stringify({
          success: false,
          error_code: "RESET_PASSWORD_FAILED",
          message: updateError.message || "Đặt lại mật khẩu không thành công.",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // G. Audit Log (Safely recorded if table exists, NEVER log the password string)
    try {
      await supabaseAdmin.from("user_audit_logs").insert({
        actor_id: callerId,
        target_user_id: targetUserId,
        action: "RESET_PASSWORD",
        details: { success: true },
      });
    } catch {
      // Ignore if user_audit_logs table does not exist
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Đã đặt lại mật khẩu cho tài khoản.",
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("Critical admin-reset-user-password error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error_code: "INTERNAL_SERVER_ERROR",
        message: "Có lỗi máy chủ xảy ra.",
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
