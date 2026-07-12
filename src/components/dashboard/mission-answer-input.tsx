"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type MissionContent = {
  answer_type?: string;
  keywords?: string[];
  min_words?: number;
  max_words?: number;
  reference_text?: string;
  claim?: string;
  items?: string[];
  categories?: string[];
  question?: string;
  options?: string[];
};

export type ClassificationAnswerValue = Record<string, string>;

function ChoiceButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={selected ? "default" : "outline"}
      onClick={onClick}
      className="justify-start text-left"
    >
      {label}
    </Button>
  );
}

export function MissionAnswerInput({
  content,
  value,
  onChange,
}: {
  content: MissionContent;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  switch (content.answer_type) {
    case "text": {
      return (
        <div className="space-y-2">
          {content.keywords && (
            <p className="text-xs text-muted-foreground">
              Mots-clés obligatoires : {content.keywords.join(", ")}
            </p>
          )}
          <Textarea
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Rédigez votre texte ici..."
            rows={6}
          />
        </div>
      );
    }

    case "boolean": {
      return (
        <div className="space-y-3">
          {content.reference_text && (
            <p className="rounded-lg bg-muted/50 p-3 text-sm leading-relaxed">{content.reference_text}</p>
          )}
          {content.claim && <p className="text-sm font-medium">{content.claim}</p>}
          <div className="flex gap-2">
            <ChoiceButton label="Vrai" selected={value === true} onClick={() => onChange(true)} />
            <ChoiceButton label="Faux" selected={value === false} onClick={() => onChange(false)} />
          </div>
        </div>
      );
    }

    case "mcq": {
      const options = content.options ?? [];
      return (
        <div className="space-y-3">
          {content.question && <p className="text-sm font-medium">{content.question}</p>}
          <div className="flex flex-col gap-2">
            {options.map((option, index) => (
              <ChoiceButton
                key={option}
                label={option}
                selected={value === index}
                onClick={() => onChange(index)}
              />
            ))}
          </div>
        </div>
      );
    }

    case "anomaly_pick": {
      const items = content.items ?? [];
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {items.map((item, index) => (
              <ChoiceButton key={item} label={item} selected={value === index} onClick={() => onChange(index)} />
            ))}
          </div>
        </div>
      );
    }

    case "classification": {
      const items = content.items ?? [];
      const categories = content.categories ?? [];
      const current = (value as ClassificationAnswerValue) ?? {};

      return (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={item} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <span className="text-sm font-medium">{item}</span>
              <div className="flex gap-2">
                {categories.map((category) => (
                  <Button
                    key={category}
                    type="button"
                    size="sm"
                    variant={current[String(index)] === category ? "default" : "outline"}
                    onClick={() => onChange({ ...current, [String(index)]: category })}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    case "text_short": {
      return (
        <div className="space-y-3">
          {content.reference_text && (
            <p className="rounded-lg bg-muted/50 p-3 text-sm leading-relaxed">{content.reference_text}</p>
          )}
          {content.question && <p className="text-sm font-medium">{content.question}</p>}
          <Input value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="Votre réponse" />
        </div>
      );
    }

    case "numeric": {
      return (
        <div className="space-y-3">
          {content.question && <p className="text-sm font-medium">{content.question}</p>}
          <Input
            type="number"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Votre réponse"
          />
        </div>
      );
    }

    default:
      return null;
  }
}

export function isAnswerComplete(content: MissionContent, value: unknown): boolean {
  switch (content.answer_type) {
    case "text":
      return typeof value === "string" && value.trim().length > 0;
    case "boolean":
      return typeof value === "boolean";
    case "mcq":
    case "anomaly_pick":
      return typeof value === "number";
    case "classification": {
      const items = content.items ?? [];
      const current = (value as ClassificationAnswerValue) ?? {};
      return items.every((_, index) => Boolean(current[String(index)]));
    }
    case "text_short":
      return typeof value === "string" && value.trim().length > 0;
    case "numeric":
      return typeof value === "string" && value.trim().length > 0 && !Number.isNaN(Number(value));
    default:
      return false;
  }
}

/** Construit le submission_data attendu par submit_mission_assignment (RPC) pour ce type de réponse. */
export function buildSubmissionData(content: MissionContent, value: unknown): Record<string, unknown> {
  switch (content.answer_type) {
    case "text":
    case "text_short":
      return { answer: value };
    case "boolean":
      return { answer: value };
    case "mcq":
    case "anomaly_pick":
      return { selected_index: value };
    case "classification":
      return { answers: value };
    case "numeric":
      return { answer: Number(value) };
    default:
      return {};
  }
}
