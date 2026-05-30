import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

function read(relativePath) {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('add flow parity', () => {
  it('shared add flow exposes the same four entry modes', () => {
    const choiceSrc = read('src/components/addflow/AddFlowChoice.jsx');
    expect(choiceSrc).toContain('Quick Search');
    expect(choiceSrc).toContain('Scan UPC / Barcode');
    expect(choiceSrc).toContain('Photo Identify');
    expect(choiceSrc).toContain('Add Manually');
  });

  it('wine and cigar wrappers delegate to AddFlowModal with the correct module type', () => {
    const wineModalSrc = read('src/components/wine/AddWineModal.jsx');
    const cigarModalSrc = read('src/components/cigars/AddCigarModal.jsx');
    expect(wineModalSrc).toContain('AddFlowModal');
    expect(wineModalSrc).toContain('initialItemType="wine"');
    expect(cigarModalSrc).toContain('AddFlowModal');
    expect(cigarModalSrc).toContain('initialItemType="cigar"');
  });

  it('module surfaces route add actions through the shared add flow or its thin wrappers', () => {
    const pipeModule = read('src/components/modules/PipeKeeperModule.jsx');
    const whiskeyPage = read('src/pages/WhiskeyKeeper.jsx');
    const wineNav = read('src/components/modules/WineKeeperModuleNav.jsx');
    const cigarNav = read('src/components/modules/CigarKeeperModuleNav.jsx');
    expect(pipeModule).toContain('AddFlowModal');
    expect(whiskeyPage).toContain('AddFlowModal');
    expect(wineNav).toContain('AddFlowModal');
    expect(cigarNav).toContain('AddCigarModal');
  });
});