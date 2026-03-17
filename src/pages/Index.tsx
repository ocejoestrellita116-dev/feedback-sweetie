import { DossierHero } from '@/components/dossier-hero/DossierHero';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { CaseStudies } from '@/components/sections/CaseStudies';
import { TechnicalWork } from '@/components/sections/TechnicalWork';
import { Strengths } from '@/components/sections/Strengths';
import { Contact } from '@/components/sections/Contact';
import { CursorLayer } from '@/components/experience/CursorLayer';

const Index = () => {
  return (
    <main>
      {/* Skip-to-content for keyboard users */}
      <a
        href="#cases"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:rounded-md focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:text-sm focus:font-sans"
      >
        Skip to content
      </a>
      <CursorLayer />
      <Navbar />
      <DossierHero />
      <CaseStudies />
      <TechnicalWork />
      <Strengths />
      <Contact />
      <Footer />
    </main>
  );
};

export default Index;
