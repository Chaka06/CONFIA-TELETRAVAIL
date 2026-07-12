"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CopyReferralLink({ referralCode }: { referralCode: string }) {
  const [copied, setCopied] = React.useState(false);
  const [link, setLink] = React.useState("");

  React.useEffect(() => {
    // window.location n'existe pas côté serveur : ce lien ne peut être
    // calculé qu'après le montage côté client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLink(`${window.location.origin}/inscription?ref=${referralCode}`);
  }, [referralCode]);

  async function handleCopy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex gap-2">
      <Input readOnly value={link} className="font-mono text-xs" />
      <Button variant="outline" size="icon" onClick={handleCopy} aria-label="Copier le lien">
        {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
      </Button>
    </div>
  );
}
