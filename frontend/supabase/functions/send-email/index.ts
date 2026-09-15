import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
// This address must use the domain verified in Resend.
const FROM_EMAIL = "Balanced Wellness <hello@donnabooking.com>";
const ADMIN_EMAILS = ["stevenantlor@gmail.com", "healwithdonna@gmail.com"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type EmailRequest = {
  type?: "appointment" | "event";
  clientEmail?: string;
  clientName?: string;
  serviceName?: string;
  date?: string;
  time?: string;
  status?: "pending" | "confirmed" | "cancelled" | "registered";
  duration?: number;
  price?: number;
};

const jsonResponse = (body: Record<string, unknown>, status: number) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const htmlEntities: Record<string, string> = {
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
};
const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => htmlEntities[character]);

async function sendEmail(payload: { to: string[]; subject: string; html: string }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM_EMAIL, ...payload }),
  });

  if (!response.ok) throw new Error(`Resend returned ${response.status}: ${await response.text()}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not configured");
    return jsonResponse({ error: "Email service is not configured" }, 500);
  }

  try {
    const body = await req.json() as EmailRequest;
    const type = body.type ?? "appointment";
    const status = body.status ?? "pending";
    const clientEmail = body.clientEmail?.trim();
    const clientName = escapeHtml(body.clientName?.trim() || "Client");
    const serviceName = escapeHtml(body.serviceName?.trim() || "Session");
    const time = escapeHtml(body.time?.trim() || "TBD");
    const duration = Number.isFinite(body.duration) ? body.duration! : 60;
    const price = Number.isFinite(body.price) ? body.price! : 0;

    if (!clientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
      return jsonResponse({ error: "A valid clientEmail is required" }, 400);
    }
    if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      return jsonResponse({ error: "date must use YYYY-MM-DD format" }, 400);
    }

    const [year, month, day] = body.date.split("-").map(Number);
    const dateObj = new Date(Date.UTC(year, month - 1, day));
    if (dateObj.getUTCFullYear() !== year || dateObj.getUTCMonth() !== month - 1 || dateObj.getUTCDate() !== day) {
      return jsonResponse({ error: "date is not valid" }, 400);
    }
    const dayOfWeek = dateObj.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
    const formattedMonthDay = `${month}/${day}`;

    let clientSubject = "";
    let clientHtml = "";
    let adminSubject = "";
    let adminHtml = "";

    if (type === "appointment") {
      if (status === "confirmed") {
        clientSubject = "✨ Confirmation: Your Reiki Session with Donna";
        clientHtml = `<p>✨Hi ${clientName},</p><p>This is a reminder of your ${serviceName} session on <strong>${dayOfWeek}, ${formattedMonthDay} at ${time}</strong>.</p><p>🏡The Healing Studio is at 19 Glenside Dr., New City, NY. It’s a beige house with white columns and a stone mailbox. Please park on the street.</p><p>🌷 <strong>*Please do not come to the front door*</strong><br/>I am ready for you when you see the garage open. Walk into the garage and the Studio door is immediately to the right inside the garage.</p><p>⏰ A healing session can run approx. ${duration} minutes.</p><p>✅ $${price} (Cash, Check, Zelle: 8456427262, Venmo: @DonnaLorence)</p><p>✨ Any questions just let me know, I'm looking forward to our session!<br/>Donna Lorence</p>`;
      } else if (status === "pending") {
        clientSubject = `Booking Request Received: ${serviceName}`;
        clientHtml = `<p>Hi ${clientName},</p><p>We have received your request for a ${serviceName} on ${formattedMonthDay} at ${time}. Donna will review and confirm this shortly!</p>`;
        adminSubject = `🚨 New Booking Request: ${clientName}`;
        adminHtml = `<p><strong>${clientName}</strong> (${escapeHtml(clientEmail)}) requested a <strong>${serviceName}</strong> on <strong>${formattedMonthDay} at ${time}</strong>.</p><p>Please log into the admin dashboard to confirm or cancel this time slot.</p>`;
      } else if (status === "cancelled") {
        clientSubject = `Cancelled: ${serviceName}`;
        clientHtml = `<p>Hi ${clientName},</p><p>Your ${serviceName} on ${formattedMonthDay} at ${time} has been successfully cancelled.</p>`;
        adminSubject = `❌ Session Cancelled: ${clientName}`;
        adminHtml = `<p><strong>${clientName}</strong> has cancelled their ${serviceName} on ${formattedMonthDay} at ${time}.</p>`;
      }
    } else if (type === "event" && status === "registered") {
      clientSubject = `✨ Spot Secured: ${serviceName}`;
      clientHtml = `<p>Hi ${clientName},</p><p>Your payment was successful and your spot for <strong>${serviceName}</strong> on <strong>${dayOfWeek}, ${formattedMonthDay} at ${time}</strong> is officially secured!</p><p>🏡 The event will be held at The Healing Studio: 19 Glenside Dr., New City, NY. Please park on the street.</p><p>We look forward to seeing you!</p>`;
      adminSubject = `🎉 New Event Registration: ${clientName}`;
      adminHtml = `<p><strong>${clientName}</strong> (${escapeHtml(clientEmail)}) just paid via Stripe and secured their spot for <strong>${serviceName}</strong> on ${formattedMonthDay} at ${time}!</p>`;
    } else {
      return jsonResponse({ error: "Unsupported email type or status" }, 400);
    }

    const messages = [sendEmail({ to: [clientEmail], subject: clientSubject, html: clientHtml })];
    if (adminSubject) messages.push(sendEmail({ to: ADMIN_EMAILS, subject: adminSubject, html: adminHtml }));
    await Promise.all(messages);

    return jsonResponse({ success: true }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send email";
    console.error("send-email failed:", error);
    return jsonResponse({ error: message }, 500);
  }
});
