import type { Metadata } from "next";
import Link from "next/link";
import { MobileShell } from "@/components/MobileShell";
import { getLegalInfo, getSalonInfo } from "@/app/lib/settings";

export const metadata: Metadata = { title: "Confidențialitate" };

// GDPR art. 13 notice for the salon's clients. A template that describes what
// this app actually stores and sends; the salon's own details come from Profil
// → Date legale. The salon should have it reviewed by a lawyer.
const UPDATED = "28 octombrie 2026";

export default async function PrivacyPage() {
  const [salon, legal] = await Promise.all([getSalonInfo(), getLegalInfo()]); // cached, so the page stays static
  const operator = legal.company || salon.name;

  return (
    <MobileShell>
      <main className="flex-1 px-6 pt-10 pb-12 text-sm leading-relaxed text-gray-700">
        <Link href="/" className="text-primary hover:underline">
          ← Înapoi
        </Link>
        <h1 className="mt-3 text-3xl text-gray-900">Nota de informare privind datele personale</h1>
        <p className="mt-1 text-xs text-gray-500">Ultima actualizare: {UPDATED}</p>

        <Section title="Cine suntem">
          <p>
            Operatorul datelor tale este <strong>{operator}</strong>
            {legal.cui && <>, CUI {legal.cui}</>}
            {legal.address && <>, cu sediul în {legal.address}</>}, care administrează salonul {salon.name} și această aplicație.
          </p>
          <p>
            Pentru orice întrebare sau cerere privind datele tale:{" "}
            {legal.email ? <a href={`mailto:${legal.email}`} className="text-primary hover:underline">{legal.email}</a> : "la salon"}
            {salon.phone && <>, telefon {salon.phone}</>}.
          </p>
        </Section>

        <Section title="Ce date avem despre tine">
          <ul className="list-disc space-y-1 pl-5">
            <li>numele, numărul de telefon și, dacă ni l-ai dat, adresa de email;</li>
            <li>programările tale: serviciul, data și ora, prețul, prezența sau întârzierea;</li>
            <li>cererile de anulare sau reprogramare și mesajele scrise de tine;</li>
            <li>intervalul de întreținere pentru serviciile care o au;</li>
            <li>alergiile și sensibilitățile, <strong>numai cu acordul tău explicit</strong>;</li>
            <li>note de lucru ale salonului despre servicii (de exemplu formula de culoare);</li>
            <li>parola, păstrată doar criptat (nimeni de la salon nu o poate citi).</li>
          </ul>
        </Section>

        <Section title="De ce le folosim și pe ce temei">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Programările, SMS-urile de confirmare și reamintire, răspunsurile la cererile tale: pentru serviciile pe care ni le
              ceri (art. 6 alin. 1 lit. b GDPR).
            </li>
            <li>SMS-ul de întreținere („e timpul să revii”): interesul nostru legitim; îl poți opri oricând din Profil (art. 6 alin. 1 lit. f).</li>
            <li>
              Alergiile: pentru siguranța ta în timpul tratamentelor, doar cu acordul tău explicit (art. 9 alin. 2 lit. a). Îl poți
              retrage oricând din Profil; alergiile se șterg atunci.
            </li>
            <li>Securitatea contului și funcționarea aplicației: interesul nostru legitim.</li>
          </ul>
          <p>Nu îți trimitem mesaje publicitare și nu luăm decizii automate despre tine.</p>
        </Section>

        <Section title="Cui le transmitem">
          <ul className="list-disc space-y-1 pl-5">
            <li>SMSLink (România), care trimite SMS-urile: numele, telefonul, data, ora și serviciul programării;</li>
            <li>furnizorul serverului pe care rulează aplicația, în România.</li>
          </ul>
          <p>Ei prelucrează datele doar la cererea noastră. Datele nu sunt vândute și nu ies din Uniunea Europeană.</p>
        </Section>

        <Section title="Cât timp le păstrăm">
          <p>
            Cât timp ești clientul salonului. La cererea ta ștergem contul împreună cu programările și cererile. Copiile de
            siguranță se șterg automat în cel mult 14 zile, iar jurnalul tehnic de erori în 30 de zile.
          </p>
        </Section>

        <Section title="Drepturile tale">
          <p>
            Poți cere acces la datele tale și o copie a lor, corectarea, ștergerea sau restricționarea lor, te poți opune
            prelucrării și îți poți retrage oricând acordul dat. Scrie-ne sau spune-ne la salon; răspundem în cel mult o lună.
          </p>
          <p>
            Ai dreptul să depui o plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal
            (ANSPDCP), www.dataprotection.ro.
          </p>
        </Section>

        <Section title="Cookie-uri">
          <p>
            Folosim un singur cookie, necesar ca să rămâi conectat, și reținem pe telefonul tău dacă ai ascuns mesajul de
            instalare. Nu folosim cookie-uri de analiză sau publicitate, iar fonturile sunt găzduite de noi.
          </p>
        </Section>

        <Section title="Cum le protejăm">
          <p>Conexiune criptată (HTTPS), parole păstrate doar criptat, acces la date numai pentru personalul salonului.</p>
        </Section>
      </main>
    </MobileShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 space-y-2">
      <h2 className="text-base font-medium text-gray-900">{title}</h2>
      {children}
    </section>
  );
}
