import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

function getCorsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Content-Type": "application/json",
  };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");

  // 1. Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: getCorsHeaders(origin) });
  }

  const corsHeaders = getCorsHeaders(origin);

  try {
    // 2. Authenticate caller Bearer token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({
          success: false,
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
          message: "Cấu hình hệ thống chưa hoàn chỉnh (Thiếu Supabase Keys).",
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    // 3. Verify caller JWT
    const supabaseCaller = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user: callerUser }, error: authError } = await supabaseCaller.auth.getUser(token);
    if (authError || !callerUser) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Token xác thực không hợp lệ hoặc đã hết hạn.",
        }),
        { status: 401, headers: corsHeaders }
      );
    }

    const callerId = callerUser.id;

    // 4. Parse & Validate request body
    let body: any;
    try {
      body = await req.json();
    } catch (_) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Dữ liệu yêu cầu không đúng định dạng JSON.",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { user_id, new_password } = body || {};

    if (!user_id || typeof user_id !== "string" || !UUID_REGEX.test(user_id.trim())) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Mã người dùng (user_id) không hợp lệ.",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const targetUserId = user_id.trim();

    if (!new_password || typeof new_password !== "string" || new_password.trim().length < 8) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Mật khẩu mới phải có ít nhất 8 ký tự.",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 5. Initialize Supabase Admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 6. Check caller permissions from public.user_roles (SUPER_ADMIN or PRINCIPAL)
    const { data: callerRolesData } = await supabaseAdmin
      .from("user_roles")
      .select("role_code")
      .eq("user_id", callerId);

    const callerRoles = (callerRolesData || []).map((r: any) => r.role_code);
    const isSuperAdmin = callerRoles.includes("SUPER_ADMIN");
    const isPrincipal = callerRoles.includes("PRINCIPAL");

    if (!isSuperAdmin && !isPrincipal) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Bạn không có quyền đặt lại mật khẩu tài khoản này.",
        }),
        { status: 403, headers: corsHeaders }
      );
    }

    // 7. Protect SUPER_ADMIN target accounts from PRINCIPAL reset
    const { data: targetRolesData } = await supabaseAdmin
      .from("user_roles")
      .select("role_code")
      .eq("user_id", targetUserId);

    const targetRoles = (targetRolesData || []).map((r: any) => r.role_code);
    const isTargetSuperAdmin = targetRoles.includes("SUPER_ADMIN");

    if (isTargetSuperAdmin && !isSuperAdmin) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Bạn không có quyền đặt lại mật khẩu tài khoản này.",
        }),
        { status: 403, headers: corsHeaders }
      );
    }

    // 8. Execute password reset using admin client
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      {
        password: new_password.trim(),
      }
    );

    if (updateError) {
      console.error(`auth.admin.updateUserById error for user ${targetUserId}:`, updateError.message);
      return new Response(
        JSON.stringify({
          success: false,
          message: updateError.message || "Không thể đặt lại mật khẩu cho tài khoản.",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 9. Return success response (never include password in output or logs)
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
        message: "Có lỗi máy chủ xảy ra.",
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
