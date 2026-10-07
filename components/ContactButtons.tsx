import { MessageCircle, Phone } from "lucide-react";
import { telLink, whatsappLink } from "@/lib/phone";

// Call and WhatsApp buttons. The WhatsApp chat opens with `message` already
// typed; the admin can still edit it before sending.
export function ContactButtons({ phone, message, className = "" }: { phone: string | null; message: string; className?: string }) {
  if (!phone) return <p className={`text-xs text-gray-500 ${className}`}>Clientul nu are telefon salvat.</p>;

  const tel = telLink(phone);
  const whatsapp = whatsappLink(phone, message);
  const button = "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition";

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tel && (
        <a href={tel} className={`${button} bg-primary-soft text-primary-dark hover:bg-primary hover:text-white`}>
          <Phone className="h-4 w-4" /> Sună · {phone}
        </a>
      )}
      {whatsapp && (
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={`${button} bg-[#25D366] text-[#073B1F] hover:bg-[#1EBE5A]`}>
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </a>
      )}
    </div>
  );
}
