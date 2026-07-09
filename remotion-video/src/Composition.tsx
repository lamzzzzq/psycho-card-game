import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import { Card } from './Card';
import { T, DIMS, CARDS, KNOWLEDGE } from './theme';

const EASE = Easing.bezier(0.16, 1, 0.3, 1);
const fade = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE });
const rise = (f: number, a: number, b: number, px = 26) => interpolate(f, [a, b], [px, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE });

const NEEDS: Record<string, number> = { O: 4, C: 2, E: 4, A: 4, N: 3 };

const Caption: React.FC<{ text: string; from: number }> = ({ text, from }) => {
  const f = useCurrentFrame();
  const o = fade(f, from, from + 10);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 42, display: 'flex', justifyContent: 'center', opacity: o }}>
      <div style={{ maxWidth: 900, padding: '12px 26px', borderRadius: 999, background: 'rgba(255,251,243,0.92)', border: `1px solid ${T.cardLineSoft}`, boxShadow: '0 8px 24px rgba(120,90,50,0.16)', color: T.ink, fontSize: 25, fontWeight: 500, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
        {text}
      </div>
    </div>
  );
};

const Eyebrow: React.FC<{ children: React.ReactNode; o: number }> = ({ children, o }) => (
  <div style={{ fontFamily: T.serif, fontSize: 17, letterSpacing: '0.42em', textTransform: 'uppercase', color: T.gold, opacity: o, marginBottom: 14 }}>{children}</div>
);

const S1: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 70 }}>
        <div style={{ opacity: fade(f, 20, 50), translate: `0px ${rise(f, 20, 50)}px` }}>
          <Card cardId={CARDS.E1.id} statement={CARDS.E1.text} revealed="E" width={210} />
        </div>
        <div style={{ textAlign: 'left' }}>
          <Eyebrow o={fade(f, 4, 24)}>Tutorial</Eyebrow>
          <div style={{ fontFamily: T.serif, fontSize: 62, fontWeight: 700, color: T.ink, lineHeight: 1.1, opacity: fade(f, 10, 36), translate: `0px ${rise(f, 10, 36)}px` }}>Personalities<br />Mahjong</div>
          <div style={{ fontSize: 26, color: T.inkSoft, marginTop: 16, opacity: fade(f, 30, 56), fontFamily: 'system-ui, sans-serif' }}>A 60-second walkthrough</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const S2: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingBottom: 100 }}>
      <Eyebrow o={fade(f, 4, 24)}>The Goal</Eyebrow>
      <div style={{ fontFamily: T.serif, fontSize: 46, fontWeight: 700, color: T.ink, opacity: fade(f, 8, 30), marginBottom: 40 }}>Declare all 5 dimensions</div>
      <div style={{ display: 'flex', gap: 18 }}>
        {DIMS.map((d, i) => {
          const start = 30 + i * 12;
          return (
            <div key={d.k} style={{ opacity: fade(f, start, start + 16), translate: `0px ${rise(f, start, start + 16, 20)}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '18px 22px', borderRadius: 20, background: '#fdf9f0', border: `1px solid ${T.cardLineSoft}`, boxShadow: '0 8px 20px rgba(120,90,50,0.1)' }}>
              <span style={{ width: 20, height: 20, borderRadius: 999, background: d.color }} />
              <span style={{ fontSize: 17, color: T.inkSoft, fontFamily: 'system-ui, sans-serif', fontWeight: 600 }}>{d.en}</span>
              <span style={{ fontSize: 22, color: T.gold, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>×{NEEDS[d.k]}</span>
            </div>
          );
        })}
      </div>
      <Caption from={44} text="Complete a set for all five personality dimensions to win." />
    </AbsoluteFill>
  );
};

const S3: React.FC = () => {
  const f = useCurrentFrame();
  const Label: React.FC<{ t: string; sub: string; o: number }> = ({ t, sub, o }) => (
    <div style={{ textAlign: 'center', marginTop: 20, opacity: o }}>
      <div style={{ fontFamily: T.serif, fontSize: 26, fontWeight: 700, color: T.ink }}>{t}</div>
      <div style={{ fontSize: 18, color: T.inkSoft, marginTop: 4, fontFamily: 'system-ui, sans-serif' }}>{sub}</div>
    </div>
  );
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingBottom: 110 }}>
      <Eyebrow o={fade(f, 4, 22)}>Two Kinds of Cards</Eyebrow>
      <div style={{ display: 'flex', gap: 90, marginTop: 16 }}>
        <div style={{ opacity: fade(f, 16, 42), translate: `0px ${rise(f, 16, 42)}px` }}>
          <Card cardId={CARDS.E1.id} statement={CARDS.E1.text} revealed="E" width={220} />
          <Label t="Personality card" sub="carries one dimension" o={fade(f, 30, 52)} />
        </div>
        <div style={{ opacity: fade(f, 40, 66), translate: `0px ${rise(f, 40, 66)}px` }}>
          <Card term={KNOWLEDGE.term} definition={KNOWLEDGE.def} width={220} />
          <Label t="Knowledge card" sub="neutral — a safe discard" o={fade(f, 54, 76)} />
        </div>
      </div>
      <Caption from={20} text="Personality cards belong to a dimension. Knowledge cards are neutral." />
    </AbsoluteFill>
  );
};

const S4: React.FC = () => {
  const f = useCurrentFrame();
  const W = 190;
  const inX = interpolate(f, [30, 70], [520, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE });
  const inO = fade(f, 30, 55);
  const locked = f >= 110;
  const glowO = interpolate(f, [110, 130], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const glow = locked ? `rgba(195,154,82,${(0.55 + 0.35 * Math.sin((f - 110) / 5)) * glowO})` : undefined;
  const setLift = locked ? interpolate(f, [110, 128], [0, -18], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE }) : 0;
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingBottom: 150 }}>
      <Eyebrow o={fade(f, 4, 22)}>Match &amp; Declare</Eyebrow>
      <div style={{ fontFamily: T.serif, fontSize: 40, fontWeight: 700, color: T.ink, opacity: fade(f, 8, 28), marginBottom: 8 }}>
        Collect same-dimension cards
      </div>
      <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginTop: 26, translate: `0px ${setLift}px` }}>
        <div style={{ opacity: fade(f, 10, 34), translate: `0px ${rise(f, 10, 34)}px` }}>
          <Card cardId={CARDS.E1.id} statement={CARDS.E1.text} revealed="E" width={W} glow={glow} />
        </div>
        <div style={{ opacity: fade(f, 18, 42), translate: `0px ${rise(f, 18, 42)}px` }}>
          <Card cardId={CARDS.E11.id} statement={CARDS.E11.text} revealed="E" width={W} glow={glow} />
        </div>
        <div style={{ fontSize: 44, color: T.gold, fontWeight: 300, opacity: fade(f, 60, 74) }}>+</div>
        <div style={{ opacity: inO, translate: `${inX}px 0px` }}>
          <Card cardId={CARDS.E6.id} statement={CARDS.E6.text} revealed="E" width={W} glow={glow} />
        </div>
      </div>
      {locked && (
        <div style={{ marginTop: 22, opacity: glowO, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ padding: '10px 24px', borderRadius: 999, background: '#facc15', color: '#1a1a1a', fontWeight: 800, fontSize: 24, fontFamily: 'system-ui, sans-serif', boxShadow: '0 8px 22px rgba(180,150,40,0.4)' }}>✓ Extraversion set locked</span>
        </div>
      )}
      <Caption from={2} text="Two cards in hand + one incoming = a complete set. Declare it — Pong!" />
    </AbsoluteFill>
  );
};

const S5: React.FC = () => {
  const f = useCurrentFrame();
  const allDone = f >= 180;
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingBottom: 100 }}>
      <Eyebrow o={fade(f, 4, 22)}>Win</Eyebrow>
      <div style={{ display: 'flex', gap: 16, marginBottom: 40 }}>
        {DIMS.map((d, i) => {
          const on = 20 + i * 26;
          const lit = f >= on;
          return (
            <div key={d.k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 20px', borderRadius: 18, background: lit ? d.color : '#fdf9f0', border: `1px solid ${lit ? d.color : T.cardLineSoft}`, opacity: fade(f, 8, 24), scale: lit ? `${interpolate(f, [on, on + 8], [0.9, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE })}` : '0.9', boxShadow: lit ? '0 8px 22px rgba(0,0,0,0.14)' : 'none' }}>
              <span style={{ fontSize: 16, color: lit ? '#1a1a1a' : T.inkSoft, fontWeight: 700, fontFamily: 'system-ui, sans-serif' }}>{d.en}</span>
              <span style={{ fontSize: 20 }}>{lit ? '✓' : '·'}</span>
            </div>
          );
        })}
      </div>
      <div style={{ fontFamily: T.serif, fontSize: 76, fontWeight: 800, color: T.gold, opacity: allDone ? fade(f, 180, 200) : 0, scale: allDone ? `${interpolate(f, [180, 202], [0.7, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE })}` : '0.7', letterSpacing: '0.08em' }}>WIN!</div>
      <Caption from={2} text="Declare all five to win outright — otherwise, the most sets ranks highest." />
    </AbsoluteFill>
  );
};

const S6: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', opacity: fade(f, 4, 26), scale: `${interpolate(f, [4, 30], [0.85, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE })}` }}>
        <div style={{ fontFamily: T.serif, fontSize: 52, fontWeight: 700, color: T.ink }}>Try it in the sandbox</div>
        <div style={{ fontSize: 28, color: T.gold, marginTop: 14, fontFamily: 'system-ui, sans-serif' }}>▶ Enter the interactive sandbox</div>
      </div>
    </AbsoluteFill>
  );
};

export const MyComposition: React.FC = () => {
  const { fps } = useVideoConfig();
  const s = (sec: number) => Math.round(sec * fps);
  return (
    <AbsoluteFill style={{ background: T.page }}>
      <Sequence durationInFrames={s(8)}><S1 /></Sequence>
      <Sequence from={s(8)} durationInFrames={s(10)}><S2 /></Sequence>
      <Sequence from={s(18)} durationInFrames={s(12)}><S3 /></Sequence>
      <Sequence from={s(30)} durationInFrames={s(16)}><S4 /></Sequence>
      <Sequence from={s(46)} durationInFrames={s(12)}><S5 /></Sequence>
      <Sequence from={s(58)} durationInFrames={s(2)}><S6 /></Sequence>
    </AbsoluteFill>
  );
};
