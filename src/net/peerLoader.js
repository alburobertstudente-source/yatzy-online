/**
 * Carica la libreria PeerJS (WebRTC) solo quando serve la modalità online.
 * Il file è incluso nel progetto (vendor/peerjs.min.js): nessun CDN esterno.
 * Nella versione compilata in un unico file è già incorporata.
 */
let loading = null;

export function loadPeer() {
  if (globalThis.Peer) return Promise.resolve(globalThis.Peer);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = new URL('vendor/peerjs.min.js', document.baseURI).href;
      s.async = true;
      s.onload = () => (globalThis.Peer ? resolve(globalThis.Peer) : reject(new Error('PeerJS non disponibile')));
      s.onerror = () => {
        loading = null;
        reject(new Error('Impossibile caricare la modalità online'));
      };
      document.head.append(s);
    });
  }
  return loading;
}
