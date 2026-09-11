/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // La generazione delle pagine statiche gira su worker. Il default di
    // Next usa processi figli, uno per CPU vista sulla macchina: su un
    // hosting condiviso (CloudLinux/LVE) il tetto di processi per utente
    // viene raggiunto e la build muore con
    // "spawn ... EAGAIN" — proprio mentre il sito in produzione occupa
    // già parte di quei processi. Con i thread non si spawna nulla, e
    // con un solo worker il consumo resta minimo.
    // Il costo è trascurabile: questo sito ha ~20 pagine e la
    // generazione statica dura meno di un secondo.
    // Vedi AI/DECISIONS.md D50.
    workerThreads: true,
    cpus: 1,
  },
};

module.exports = nextConfig;
