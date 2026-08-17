// =====================================================
// Email Helper — sends emails via /api/send-email
// =====================================================

export async function sendNewBookingEmail({ expertName, expertEmail, bookingCode, institutionName, applicantName, phone, level, totalSections, totalPrice }) {
  try {
    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: expertEmail,
        subject: `طلب حجز جديد - ${bookingCode}`,
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #0F3D3E; color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">جدول مدرسي</h1>
              <p style="margin: 8px 0 0; opacity: 0.9;">طلب حجز جديد</p>
            </div>
            <div style="background-color: #fff; padding: 20px; border: 1px solid #DCE2D6; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px; color: #0F3D3E;">مرحباً ${expertName}،</p>
              <p style="font-size: 14px; color: #555;">لديك طلب حجز جديد من ${institutionName}.</p>
              <div style="background-color: #F5F6F0; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p style="margin: 4px 0; font-size: 14px;"><strong>كود الحجز:</strong> ${bookingCode}</p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>صاحب الطلب:</strong> ${applicantName}</p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>الهاتف:</strong> ${phone}</p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>الطور:</strong> ${level}</p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>عدد الأقسام:</strong> ${totalSections}</p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>المبلغ:</strong> ${totalPrice} دج</p>
              </div>
              <p style="font-size: 14px; color: #555;">سجّل دخولك على لوحة التحكم لمراجعة الطلب.</p>
              <div style="text-align: center; margin-top: 20px;">
                <a href="${typeof window !== "undefined" ? window.location.origin : ""}/expert/login"
                   style="display: inline-block; background-color: #0F3D3E; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                  فتح لوحة التحكم
                </a>
              </div>
            </div>
            <p style="text-align: center; font-size: 12px; color: #8A9188; margin-top: 16px;">
              هذا إلكتروني تلقائي من نظام جدول مدرسي
            </p>
          </div>
        `,
      }),
    });
    const data = await res.json();
    return data;
  } catch (e) {
    console.error("Failed to send new booking email:", e);
    return { error: e.message };
  }
}

export async function sendNewRegistrationEmail({ adminEmail, requestName, requestUsername, requestEmail, requestId }) {
  try {
    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: adminEmail,
        subject: `طلب تسجيل خبير جديد - ${requestName}`,
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #0F3D3E; color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">جدول مدرسي</h1>
              <p style="margin: 8px 0 0; opacity: 0.9;">طلب تسجيل خبير جديد</p>
            </div>
            <div style="background-color: #fff; padding: 20px; border: 1px solid #DCE2D6; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px; color: #0F3D3E;">مرحباً،</p>
              <p style="font-size: 14px; color: #555;">هناك طلب تسجيل خبير جديد في انتظار مراجعتك.</p>
              <div style="background-color: #F5F6F0; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p style="margin: 4px 0; font-size: 14px;"><strong>الاسم:</strong> ${requestName}</p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>اسم المستخدم:</strong> ${requestUsername}</p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>البريد:</strong> ${requestEmail}</p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>رقم الطلب:</strong> ${requestId}</p>
              </div>
              <p style="font-size: 14px; color: #555;">سجّل دخولك على لوحة الأدمن لمراجعة الطلب.</p>
              <div style="text-align: center; margin-top: 20px;">
                <a href="${typeof window !== "undefined" ? window.location.origin : ""}/admin/dashboard"
                   style="display: inline-block; background-color: #0F3D3E; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                  فتح لوحة الأدمن
                </a>
              </div>
            </div>
            <p style="text-align: center; font-size: 12px; color: #8A9188; margin-top: 16px;">
              هذا إلكتروني تلقائي من نظام جدول مدرسي
            </p>
          </div>
        `,
      }),
    });
    const data = await res.json();
    return data;
  } catch (e) {
    console.error("Failed to send registration email:", e);
    return { error: e.message };
  }
}

export async function sendRegistrationApprovedEmail({ expertName, expertEmail, username, password }) {
  try {
    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: expertEmail,
        subject: "تم قبول طلب تسجيلك كخبير",
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #3F7859; color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">جدول مدرسي</h1>
              <p style="margin: 8px 0 0; opacity: 0.9;">تم قبول طلب تسجيلك</p>
            </div>
            <div style="background-color: #fff; padding: 20px; border: 1px solid #DCE2D6; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px; color: #0F3D3E;">مرحباً ${expertName}،</p>
              <p style="font-size: 14px; color: #555;">تم قبول طلب تسجيلك كخبير. يمكنك الآن تسجيل الدخول بالبيانات التالية:</p>
              <div style="background-color: #F5F6F0; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p style="margin: 4px 0; font-size: 14px;"><strong>اسم المستخدم:</strong> ${username}</p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>كلمة المرور:</strong> ${password}</p>
              </div>
              <div style="text-align: center; margin-top: 20px;">
                <a href="${typeof window !== "undefined" ? window.location.origin : ""}/expert/login"
                   style="display: inline-block; background-color: #0F3D3E; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                  تسجيل الدخول
                </a>
              </div>
            </div>
            <p style="text-align: center; font-size: 12px; color: #8A9188; margin-top: 16px;">
              هذا إلكتروني تلقائي من نظام جدول مدرسي
            </p>
          </div>
        `,
      }),
    });
    const data = await res.json();
    return data;
  } catch (e) {
    console.error("Failed to send approved email:", e);
    return { error: e.message };
  }
}
