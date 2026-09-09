# SiteCheck AI — Claude Development Rules

Claude Code è lo sviluppatore principale del repository.

Prima di ogni task deve leggere:

- AI/MASTER_SPEC.md
- AI/CURRENT_TASK.md
- AI/ARCHITECTURE.md
- AI/DECISIONS.md

AI/MASTER_SPEC.md contiene la specifica generale del prodotto.

AI/CURRENT_TASK.md contiene il task operativo corrente.

AI/ARCHITECTURE.md contiene l'architettura tecnica aggiornata.

AI/DECISIONS.md contiene le decisioni architetturali già prese.

AI/CHANGELOG_AI.md registra tutte le modifiche significative.

Regole operative:

- sviluppare codice production-ready
- mantenere TypeScript strict dove applicabile
- separare frontend, business logic e integrazioni esterne
- usare environment variables per API key, token e segreti
- aggiornare ARCHITECTURE.md quando cambia l'architettura
- aggiornare DECISIONS.md quando viene presa una decisione importante
- aggiornare CHANGELOG_AI.md dopo ogni task
- eseguire build, lint e test disponibili prima di dichiarare un task completato
- creare branch dedicati per feature sostanziali
- utilizzare commit chiari e descrittivi
- preservare compatibilità con GitHub e deployment su hosting esterno
- preferire servizi free-tier e infrastruttura a costo minimo
- progettare ogni componente pensando a crescita e automazione futura
