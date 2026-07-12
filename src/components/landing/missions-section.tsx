import { BarChart3, CheckSquare, ClipboardList, FileText, ListChecks, SearchCheck } from "lucide-react";

import { BlobImage } from "@/components/landing/blob-image";

const MISSION_TYPES = [
  { icon: FileText, title: "Rédaction de courts contenus", description: "Textes courts et originaux sur des thèmes variés." },
  { icon: SearchCheck, title: "Vérification d'informations", description: "Évaluer la véracité d'une affirmation et la justifier." },
  { icon: ListChecks, title: "Classification de données", description: "Ranger des éléments selon un critère précis." },
  { icon: CheckSquare, title: "Validation de contenus", description: "Contrôler la conformité d'un contenu à des critères définis." },
  { icon: BarChart3, title: "Analyse de textes", description: "Dégager l'idée principale d'un extrait donné." },
  { icon: ClipboardList, title: "Questionnaires et tests simples", description: "Répondre à des questions fermées en quelques minutes." },
];

export function MissionsSection() {
  return (
    <section id="missions" className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,320px)_1fr] lg:items-start">
          <div className="mx-auto lg:sticky lg:top-24 lg:mx-0">
            <BlobImage
              variant={2}
              src="https://www.anthedesign.fr/wp-content/uploads/2013/01/salaries-preferent-teletravail-augmentation-F.jpg"
              alt="Salarié satisfait de travailler à distance"
              className="aspect-square w-full max-w-sm shadow-xl shadow-primary/10"
            />
          </div>

          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              Des missions réalistes et variées
            </h2>
            <p className="mt-3 text-muted-foreground">
              Un travail réel, réalisable en deux à cinq minutes, sur des sujets renouvelés.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {MISSION_TYPES.map((m) => (
                <div key={m.title} className="flex items-start gap-4 rounded-xl border border-border p-5">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <m.icon className="size-5 text-primary" aria-hidden />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{m.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{m.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
