import { Atelier } from '../components/home/Atelier';
import { CollectionsRail } from '../components/home/CollectionsRail';
import { Featured } from '../components/home/Featured';
import { Guarantees } from '../components/home/Guarantees';
import { Hero } from '../components/home/Hero';
import { KaratStrip } from '../components/home/KaratStrip';
import { Marquee } from '../components/home/Marquee';

export function HomePage() {
  return (
    <>
      <Hero />
      <Marquee />
      <Featured />
      <CollectionsRail />
      <KaratStrip />
      <Atelier />
      <Guarantees />
    </>
  );
}
