import { useEffect, useState } from 'react';

/**
 * TEMPORARY diagnostic: shows real viewport measurements so we can see why the
 * shell isn't reaching the screen bottom on device. Remove once resolved.
 */
export function DebugViewport() {
  const [info, setInfo] = useState('measuring…');

  useEffect(() => {
    const mk = (h: string) => {
      const d = document.createElement('div');
      d.style.cssText = `position:fixed;left:0;top:0;width:0;height:${h};`;
      document.body.appendChild(d);
      return d;
    };
    const probeTop = mk('env(safe-area-inset-top)');
    const probeBottom = mk('env(safe-area-inset-bottom)');
    const pVh = mk('100vh');
    const pDvh = mk('100dvh');
    const pSvh = mk('100svh');
    const pLvh = mk('100lvh');

    const update = () => {
      const vv = window.visualViewport;
      setInfo(
        [
          `scr=${window.screen.height}`,
          `iH=${window.innerHeight}`,
          `vvH=${vv ? Math.round(vv.height) : '-'}`,
          `vh=${pVh.offsetHeight}`,
          `dvh=${pDvh.offsetHeight}`,
          `svh=${pSvh.offsetHeight}`,
          `lvh=${pLvh.offsetHeight}`,
          `st=${probeTop.offsetHeight}`,
          `sb=${probeBottom.offsetHeight}`,
        ].join(' ')
      );
    };

    update();
    const id = window.setInterval(update, 500);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    return () => {
      window.clearInterval(id);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
      [probeTop, probeBottom, pVh, pDvh, pSvh, pLvh].forEach((p) => p.remove());
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 300,
        background: 'rgba(20,20,18,0.82)',
        color: '#fff',
        font: '11px ui-monospace, monospace',
        padding: '2px 6px',
        textAlign: 'center',
        pointerEvents: 'none',
      }}
    >
      {info}
    </div>
  );
}
