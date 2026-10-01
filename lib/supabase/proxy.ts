import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { KCC_ADMIN_EMAIL } from "@/lib/auth-config";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const email = typeof data?.claims?.email === "string" ? data.claims.email.toLowerCase() : "";
  const allowed = KCC_ADMIN_EMAIL;
  const onLogin = request.nextUrl.pathname.startsWith("/login");
  const onPasswordSetup = request.nextUrl.pathname.startsWith("/update-password");
  const onCustomerPayment = request.nextUrl.pathname.startsWith("/pay/");
  const onCustomerInvoice = request.nextUrl.pathname.startsWith("/api/invoices/");
  const isPublicRoute = onLogin || onPasswordSetup || onCustomerPayment || onCustomerInvoice;
  const isAuthorized = Boolean(data?.claims && email === allowed);

  if (!isAuthorized && !isPublicRoute) {
    const target = request.nextUrl.clone();
    target.pathname = "/login";
    return NextResponse.redirect(target);
  }
  if (isAuthorized && onLogin) {
    const target = request.nextUrl.clone();
    target.pathname = "/dashboard";
    return NextResponse.redirect(target);
  }
  return response;
}
