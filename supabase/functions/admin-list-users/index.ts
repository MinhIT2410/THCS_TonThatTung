import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

function getCorsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: "UNAUTHORIZED",
          message: "Token xác thực không hợp lệ hoặc đã hết hạn.",
        }),
        { status: 401, headers: corsHeaders }
      );
    }

    const callerId = user.id;

    // B. Check caller authorization using RPC
    const { data: isAuthorized, error: permError } = await supabaseUser.rpc("has_account_management_permission");

    if (permError || !isAuthorized) {
      // Fallback role check if RPC fails
      const { data: callerRoles } = await supabaseUser
        .from("user_roles")
        .select("role_code")
        .eq("user_id", callerId);

      const rolesList = (callerRoles || []).map((r: any) => r.role_code);
      const allowedRoles = ["SUPER_ADMIN", "PRINCIPAL", "VICE_PRINCIPAL", "STAFF"];
      const hasPermission = rolesList.some((r: string) => allowedRoles.includes(r));

      if (!hasPermission) {
        return new Response(
          JSON.stringify({
            success: false,
            error_code: "FORBIDDEN",
            message: "Bạn không có quyền xem thông tin email đăng nhập của người dùng.",
          }),
          { status: 403, headers: corsHeaders }
        );
      }
    }

    // C. Admin Client (service role) to fetch emails from auth.users
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    let allAuthUsers: any[] = [];
    let page = 1;
    const perPage = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: pageData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });

      if (listError) {
        console.error("Error calling listUsers:", listError);
        return new Response(
          JSON.stringify({
            success: false,
            error_code: "FETCH_FAILED",
            message: "Không thể tải danh sách email từ máy chủ.",
          }),
          { status: 500, headers: corsHeaders }
        );
      }

      if (pageData && pageData.users && pageData.users.length > 0) {
        allAuthUsers = allAuthUsers.concat(pageData.users);
        if (pageData.users.length < perPage) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        hasMore = false;
      }
    }

    // Map to sanitized output containing only id and email (and timestamp)
    const sanitizedUsers = allAuthUsers.map((u) => ({
      id: u.id,
      email: u.email || "",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at || null,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        data: sanitizedUsers,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("Critical admin-list-users error:", err);
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
