import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/config/env";
import { auditSummarySchema } from "../schema";
import type { AIProvider, AuditSummary, AuditSummaryInput } from "../types";

const SYSTEM_PROMPT = `Sei un assistente che spiega risultati di audit tecnici di siti web per agenzie immobiliari italiane.
Ricevi un JSON con il Site Score e un elenco di check con stato (pass/warning/fail/unknown).
Rispondi SOLO con un oggetto JSON valido, senza testo aggiuntivo, in questo formato esatto:
{"summary": "...", "top_priorities": [{"title": "...", "reason": "...", "severity": "high"|"medium"|"low"}]}
Regole:
- "summary": 2-3 frasi in italiano, tono tecnico/informativo, mai un giudizio legale definitivo.
- "top_priorities": al massimo 3 elementi, solo per check con stato "fail" o "warning".
- Usa un linguaggio come "elemento da verificare", "rilevato", "configurazione da approfondire" invece di affermazioni legali categoriche.
- Non inventare check o dati non presenti nell'input.`;

export function createAnthropicProvider(): AIProvider {
  const client = new Anthropic({ apiKey: env.AI_API_KEY });
  const model = env.AI_MODEL || "claude-haiku-4-5";

  return {
    async generateAuditSummary(
      input: AuditSummaryInput,
    ): Promise<AuditSummary> {
      const response = await client.messages.create({
        model,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: JSON.stringify(input) }],
      });

      const textBlock = response.content.find(
        (block): block is Anthropic.TextBlock => block.type === "text",
      );

      if (!textBlock) {
        throw new Error("Anthropic response contained no text block");
      }

      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Anthropic response did not contain JSON");
      }

      const parsed = JSON.parse(jsonMatch[0]) as unknown;
      const validated = auditSummarySchema.parse(parsed);

      return {
        summary: validated.summary,
        top_priorities: validated.top_priorities,
        provider: "anthropic",
        model,
      };
    },
  };
}
