import React, { useEffect, useRef, useState } from 'react';
import './TankBattle.css';
import { AMMO_NAMES } from './ammo'; // MAF_TANKRUN_UI_V1
import { Game, PLAYER_COLORS } from './engine';
import { render, buildBackground, getZones } from './render';

// Clavier (pratique pour tester sur ordinateur) : J1 = A · J2 = L · J3 = V · J4 = N
const KEYS = ['KeyA', 'KeyL', 'KeyV', 'KeyN'];

/**
 * <TankBattle />
 * Props :
 *  - onExit()     : appelée par le bouton « Quitter » (optionnel)
 *  - config       : surcharge des réglages (hp, rotSpeed, moveSpeed, fireCooldown, holdThreshold…)
 *  - fullscreen   : true (défaut) = occupe tout l'écran ; false = remplit le parent (qui doit avoir une hauteur)
 *  - className    : classe CSS supplémentaire
 */
export default function TankBattle({ onExit, config, fullscreen = true, className = '' }) {
  const [screen, setScreen] = useState('menu'); // 'menu' | 'game'
  const [total, setTotal] = useState(2);
  const [humans, setHumans] = useState(1);
  const [result, setResult] = useState(null);   // null | { winner }
  const [runId, setRunId] = useState(0);
  const [orientation, setOrientation] = useState('portrait');
  const [activeAmmo, setActiveAmmo] = useState('standard');
  // MAF_TANK_EXTRAS_LOCAL_V1 : selection de terrain, char et tir.
  const [arenaChoice, setArenaChoice] = useState('original');
  const [skins, setSkins] = useState(['spectre', 'titan', 'spectre', 'titan']);
  const [ammoTypes, setAmmoTypes] = useState(['standard', 'standard', 'standard', 'standard']);
  const updateSkin = (i, skin) => {
    setSkins((v) => v.map((old, idx) => idx === i ? skin : old));

  };
  const updateAmmo = (i, ammo) => setAmmoTypes((v) => v.map((old, idx) => idx === i ? ammo : old));

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const pointersRef = useRef(new Map());
  const startedRef = useRef({ total: 2, humans: 1 });
  const configRef = useRef(config);
  configRef.current = config;

  const start = () => {
    startedRef.current = {
      total, humans,
      arena: arenaChoice === 'original' ? undefined : arenaChoice,
      skins: skins.slice(0, total).map((s) => s === 'origine' ? null : s),
      ammo: ammoTypes.slice(0, total),
    };
    setResult(null);
    setRunId((r) => r + 1);
    setScreen('game');
  };

  useEffect(() => {
    if (screen !== 'game') return undefined;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;
    const ctx = canvas.getContext('2d');
    const { total: n, humans: h, arena, skins: selectedSkins, ammo: selectedAmmo } = startedRef.current;

    const game = new Game(Array.from({ length: n }, (_, i) => ({ human: i < h })), {
      ...(configRef.current || {}), arena, skins: selectedSkins, ammo: selectedAmmo,
    });
    game.onOver = (winner) => setResult({ winner });
    gameRef.current = game;

    const view = { W: 0, H: 0, dpr: 1, scale: 1, ox: 0, oy: 0, bg: null, humans: h };

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      view.W = r.width; view.H = r.height; view.dpr = dpr;
      view.scale = Math.min(r.width / game.w, r.height / game.h) * 0.97;
      view.ox = (r.width - game.w * view.scale) / 2;
      view.oy = (r.height - game.h * view.scale) / 2;
      view.bg = buildBackground(game, view.scale, dpr);
    };
    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(wrap);
    window.addEventListener('resize', resize);

    // boucle à pas fixe (60 Hz) + interpolation pour rester fluide sur écrans 90/120/144 Hz
    const STEP = 1 / 60;
    let last = performance.now();
    let acc = 0;
    let raf = 0;
    const frame = (now) => {
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.1) dt = 0.1;
      acc += dt;
      while (acc >= STEP) { game.update(STEP); acc -= STEP; }
      if (view.W) render(ctx, game, view, acc / STEP);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onKeyDown = (e) => {
      const idx = KEYS.indexOf(e.code);
      if (idx < 0 || idx >= h) return;
      e.preventDefault();
      if (e.repeat) return;
      game.setInput(idx, true);
    };
    const onKeyUp = (e) => {
      const idx = KEYS.indexOf(e.code);
      if (idx < 0 || idx >= h) return;
      e.preventDefault();
      game.setInput(idx, false);
    };
    const onBlur = () => { for (let i = 0; i < h; i++) game.setInput(i, false); };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    return () => {
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      game.onOver = null;
      gameRef.current = null;
      pointersRef.current.clear();
    };
  }, [screen, runId]);

  // ---- Commandes tactiles / souris : une zone par joueur humain ----
  const onDown = (e) => {
    const game = gameRef.current;
    if (screen !== 'game' || !game) return;
    if (e.target.closest && e.target.closest('[data-ui]')) return;
    const r = wrapRef.current.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width;
    const fy = (e.clientY - r.top) / r.height;
    const zones = getZones(startedRef.current.humans);
    const idx = zones.findIndex((z) => fx >= z.x0 && fx < z.x1 && fy >= z.y0 && fy < z.y1);
    if (idx < 0) return;
    for (const v of pointersRef.current.values()) if (v === idx) return;
    pointersRef.current.set(e.pointerId, idx);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    game.setInput(idx, true);
  };
  const onUp = (e) => {
    const idx = pointersRef.current.get(e.pointerId);
    if (idx === undefined) return;
    pointersRef.current.delete(e.pointerId);
    if (gameRef.current) gameRef.current.setInput(idx, false);
  };

  const winnerInfo = () => {
    if (!result) return null;
    if (result.winner < 0) return { text: 'Égalité !', color: '#ffffff' };
    const c = PLAYER_COLORS[result.winner];
    const who = result.winner < startedRef.current.humans ? `Joueur ${result.winner + 1}` : 'Bot';
    return { text: `${c.name} (${who}) gagne !`, color: c.main };
  };
  const w = winnerInfo();

  return (
    <div
      ref={wrapRef}
      className={`tb-root tr-root tr-${orientation}${fullscreen ? ' tb-fixed' : ''} ${className}`}
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {screen === 'game' && <canvas ref={canvasRef} className="tb-canvas" />}
      {screen === 'game' && <>
        <button type="button" data-ui className="tr-rotate" onClick={() => setOrientation(o => o === 'portrait' ? 'landscape' : 'portrait')} aria-label="Changer l'orientation">⤾ {orientation === 'portrait' ? 'Horizontal' : 'Vertical'}</button>
        <div data-ui className="tr-hud" aria-label="Actions du combat">
          <button type="button" className="tr-exit" onClick={() => onExit ? onExit() : setScreen('menu')}>← Sortir</button>
          <div className="tr-ammo" aria-label="Munitions">
            {AMMO_NAMES.map(a => <button key={a} type="button" className={activeAmmo === a ? 'is-active' : ''} onClick={() => {
              setActiveAmmo(a); if (gameRef.current?.tanks?.[0]) gameRef.current.tanks[0].ammo = a;
            }}>{a}</button>)}
          </div>
        </div>
      </>}

      {screen === 'game' && (
        <button
          data-ui
          className="tb-topbtn tr-hidden"
          onClick={() => setScreen('menu')}
          aria-label="Retour au menu"
        >
          ☰ Menu
        </button>
      )}

      {screen === 'menu' && (
        <div className="tb-overlay" data-ui>
          <div className="tb-card tb-card-setup">
            <h1 className="tb-title">TANK<br />RUN</h1>

            <div className="tb-row">
              <span>Joueurs</span>
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  className={`tb-chip${total === n ? ' on' : ''}`}
                  onClick={() => { setTotal(n); setHumans((h) => Math.min(h, n)); }}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="tb-row">
              <span>Humains</span>
              {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  className={`tb-chip${humans === n ? ' on' : ''}`}
                  onClick={() => setHumans(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="tb-small">Les joueurs restants sont des bots.</p>
            <div className="tb-customization">
              <label className="tb-choice-title" htmlFor="tb-terrain">Terrain</label>
              <select id="tb-terrain" className="tb-choice" value={arenaChoice} onChange={(e) => setArenaChoice(e.target.value)}>
                <option value="original">Terrain d’origine</option>
                <option value="desert">Désert (rochers, cactus)</option>
                <option value="usine">Usine (conteneurs, acier)</option>
                <option value="random">Terrain surprise : désert ou usine</option>
              </select>
              <h2 className="tb-choice-title">Chars et effets des tirs</h2>
              <p className="tb-small">Réglages pour les joueurs et les robots.</p>
              {Array.from({ length: total }, (_, i) => (
                <div className="tb-loadout" key={i}>
                  <strong>Joueur {i + 1} {i >= humans ? '· Robot' : '· Humain'}</strong>
                  <div className="tb-loadout-row">
                    <label>
                      <span>Char</span>
                      <select className="tb-choice" aria-label={'Char du joueur ' + (i + 1)} value={skins[i]} onChange={(e) => updateSkin(i, e.target.value)}>
                        <option value="origine">Classique</option>
                        <option value="spectre">Spectre · Néon</option>
                        <option value="titan">Titan · Blindé</option>
                      </select>
                    </label>

                  </div>
                </div>
              ))}
            </div>

            <ul className="tb-rules">
              <li>Ton char tourne tout seul, sans arrêt.</li>
              <li><b>Appui court</b> : tirer. Tapote rapidement pour tirer en rafale dans la même direction.</li>
              <li><b>Appui long</b> : avancer là où pointe le canon.</li>
              <li className="tb-small">Clavier : J1 = A · J2 = L · J3 = V · J4 = N</li>
            </ul>

            <button className="tb-play" onClick={start}>JOUER</button>
            {onExit && <button className="tb-ghost" onClick={onExit}>Quitter</button>}
          </div>
        </div>
      )}

      {screen === 'game' && result && w && (
        <div className="tb-overlay tb-over" data-ui>
          <div className="tb-card">
            <h2 className="tb-win" style={{ color: w.color }}>{w.text}</h2>
            <button className="tb-play" onClick={start}>REJOUER</button>
            <button className="tb-ghost" onClick={() => setScreen('menu')}>Menu</button>
          </div>
        </div>
      )}
    </div>
  );
}

// MAF_TANKRUN_STAGE_2
