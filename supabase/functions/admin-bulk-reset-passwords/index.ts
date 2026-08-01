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

    // 4. Parse request body
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

    const { academic_year_id, students } = body || {};

    if (!academic_year_id || typeof academic_year_id !== "string" || !UUID_REGEX.test(academic_year_id.trim())) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Mã năm học (academic_year_id) không hợp lệ.",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!Array.isArray(students) || students.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Danh sách học sinh cần đặt lại mật khẩu không được rỗng.",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (students.length > 50) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Mỗi đợt xử lý tối đa 50 tài khoản.",
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

    // 6. Check caller permissions from user_roles
    const { data: callerRolesData, error: callerRolesError } = await supabaseAdmin
      .from("user_roles")
      .select("role_code")
      .eq("user_id", callerId);

    if (callerRolesError) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Lỗi hệ thống khi truy vấn quyền người dùng.",
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    const callerRoles = (callerRolesData || []).map((r: any) => r.role_code);
    const isSuperAdmin = callerRoles.includes("SUPER_ADMIN");
    const isPrincipal = callerRoles.includes("PRINCIPAL");

    // If not super admin or principal, check if caller is GVCN for this academic year
    let gvcnClassIds: string[] = [];
    if (!isSuperAdmin && !isPrincipal) {
      const todayStr = new Date().toISOString().slice(0, 10);
      const { data: homeroomData, error: homeroomError } = await supabaseAdmin
        .from("homeroom_assignments")
        .select("class_id, is_active, start_date, end_date")
        .eq("teacher_id", callerId)
        .eq("academic_year_id", academic_year_id);

      if (homeroomError) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Lỗi hệ thống khi truy vấn phân công chủ nhiệm.",
          }),
          { status: 500, headers: corsHeaders }
        );
      }

      gvcnClassIds = (homeroomData || [])
        .filter((h: any) => {
          const active = h.is_active === null || h.is_active === undefined ? true : Boolean(h.is_active);
          const startValid = !h.start_date || h.start_date <= todayStr;
          const endValid = !h.end_date || h.end_date >= todayStr;
          return active && startValid && endValid;
        })
        .map((h: any) => h.class_id);

      if (gvcnClassIds.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Bạn không có quyền thực hiện thao tác đặt lại mật khẩu hàng loạt cho năm học này.",
          }),
          { status: 403, headers: corsHeaders }
        );
      }
    }

    // 7. Validate inputs and verify scope for ALL target students BEFORE updating
    const isPasswordStrong = (pwd: string): boolean => {
      if (!pwd || pwd.trim().length < 12) return false;
      const clean = pwd.trim();
      const hasUpper = /[A-Z]/.test(clean);
      const hasLower = /[a-z]/.test(clean);
      const hasDigit = /[0-9]/.test(clean);
      const hasSpecial = /[!@#$%*]/.test(clean);
      return hasUpper && hasLower && hasDigit && hasSpecial;
    };

    const studentIds: string[] = [];
    for (const item of students) {
      const { user_id, new_password } = item || {};
      if (!user_id || typeof user_id !== "string" || !UUID_REGEX.test(user_id.trim())) {
        return new Response(
          JSON.stringify({
            success: false,
            message: `Mã người dùng không hợp lệ trong danh sách.`,
          }),
          { status: 400, headers: corsHeaders }
        );
      }
      if (!new_password || typeof new_password !== "string" || !isPasswordStrong(new_password)) {
        return new Response(
          JSON.stringify({
            success: false,
            message: `Mật khẩu phải có độ dài tối thiểu 12 ký tự, bao gồm ít nhất 1 chữ hoa, 1 chữ thường, 1 chữ số và 1 ký tự đặc biệt (!@#$%*).`,
          }),
          { status: 400, headers: corsHeaders }
        );
      }
      studentIds.push(user_id.trim());
    }

    // Check duplicate user_ids in the request payload
    const normalizedIds = studentIds.map((id) => id.toLowerCase().trim());
    const uniqueIds = new Set(normalizedIds);
    if (uniqueIds.size !== normalizedIds.length) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Danh sách có tài khoản học sinh bị trùng.",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Check target users' roles (Must be STUDENT)
    const { data: targetRolesData, error: targetRolesError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role_code")
      .in("user_id", studentIds)
      .eq("role_code", "STUDENT");

    if (targetRolesError) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Lỗi hệ thống khi truy vấn vai trò học sinh.",
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    const validStudentUserIds = new Set((targetRolesData || []).map((r: any) => r.user_id));

    // Check student_enrollments in target academic year
    const { data: enrollmentsData, error: enrollmentsError } = await supabaseAdmin
      .from("student_enrollments")
      .select("student_id, class_id")
      .in("student_id", studentIds)
      .eq("academic_year_id", academic_year_id);

    if (enrollmentsError) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Lỗi hệ thống khi truy vấn danh sách phân lớp.",
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    const enrollmentMap = new Map<string, string>(); // student_id -> class_id
    (enrollmentsData || []).forEach((e: any) => {
      enrollmentMap.set(e.student_id, e.class_id);
    });

    // CRITICAL: Scope validation check on ALL items
    for (const targetId of studentIds) {
      if (!validStudentUserIds.has(targetId)) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Phát hiện tài khoản không phải là Học sinh trong danh sách. Đã từ chối toàn bộ lô.",
          }),
          { status: 403, headers: corsHeaders }
        );
      }

      const classId = enrollmentMap.get(targetId);
      if (!classId) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Phát hiện học sinh không thuộc năm học đã chọn. Đã từ chối toàn bộ lô.",
          }),
          { status: 403, headers: corsHeaders }
        );
      }

      if (!isSuperAdmin && !isPrincipal) {
        if (!gvcnClassIds.includes(classId)) {
          return new Response(
            JSON.stringify({
              success: false,
              message: "Phát hiện học sinh nằm ngoài lớp chủ nhiệm của bạn. Đã từ chối toàn bộ lô.",
            }),
            { status: 403, headers: corsHeaders }
          );
        }
      }
    }

    // 8. Execute batch updates with concurrency limit = 5
    const results: Array<{ user_id: string; success: boolean; error?: string }> = [];
    const concurrencyLimit = 5;

    for (let i = 0; i < students.length; i += concurrencyLimit) {
      const chunk = students.slice(i, i + concurrencyLimit);
      const chunkPromises = chunk.map(async (item: { user_id: string; new_password: string }) => {
        const uid = item.user_id.trim();
        const pwd = item.new_password.trim();

        try {
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(uid, {
            password: pwd,
            email_confirm: true,
          });

          if (updateError) {
            return {
              user_id: uid,
              success: false,
              error: updateError.message || "Không thể cập nhật mật khẩu.",
            };
          }

          return {
            user_id: uid,
            success: true,
          };
        } catch (err: any) {
          return {
            user_id: uid,
            success: false,
            error: err.message || "Lỗi máy chủ khi cập nhật.",
          };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Đã xử lý đợt đặt lại mật khẩu.",
        results,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("Critical admin-bulk-reset-passwords error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Có lỗi máy chủ xảy ra.",
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
