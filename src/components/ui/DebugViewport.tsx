import { useEffect, useState } from 'react';

/**
 * TEMPORARY diagnostic: shows real viewport measurements so we can see why the
 * shell isn't reaching the screen bottom on device. Remove once resolved.
 */
export function DebugViewport() {
  const [info, setInfo] = useState('measuring…');

  useEffect(() => {
    const probeBottom = document.createElement('div');
    probeBottom.style.cssText =
      'position:fixed;left:0;bottom:0;width:0;height:env(safe-area-inset-bottom);';
    const probeTop = document.createElement('div');
    probeTop.style.cssText =
      'position:fixed;left:0;top:0;width:0;height:env(safe-area-inset-top);';
    document.body.appendChild(probeBottom);
    document.body.appendChild(probeTop);

    const update = () => {
      const vv = window.visualViewport;
      setInfo(
        [
          `scr=${window.screen.height}`,
          `iH=${window.innerHeight}`,
          `vvH=${vv ? Math.round(vv.height) : '-'}`,
          `cH=${document.documentElement.clientHeight}`,
          `st=${probeTop.offsetHeight}`,
          `sb=${probeBottom.offsetHeight}`,
          `dpr=${window.devicePixelRatio}`,
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
      probeBottom.remove();
      probeTop.remove();
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
