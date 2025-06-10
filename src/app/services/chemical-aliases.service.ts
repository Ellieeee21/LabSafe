import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ChemicalAliasesService {
   private chemicalAliases: { [key: string]: string[] } = {
  'Acetone': ['2-propanone', 'Dimethyl Ketone', 'Dimethylformaldehyde', 'Pyroacetic Acid'],
    'Acetone and Nitric Acid': [],
    'Activated Carbon': ['Activated Charcoal', 'Activated Charcoal Powder'],
    'Acetic Acid': ['Glacial Acetic Acid'],
    'Ethyl Acetate': ['Acetic Acid,Ethyl Ester', 'Acetoxyethane', 'Ethyl Ethanoate'],
    'Aluminum': ['Aluminum Powder'],
    'Aluminum and Diethyl Ether': [],
    'Aluminum Oxide': ['Alpha-alumina', 'Aluminia', 'Aluminum Oxide Powder'],
    'Ammonia': [],
    'Acetylene and Ammonia': [],
    'Ammonium Hydroxide': ['Aqueous Ammonia', 'Strong Ammonia Solution', 'Stronger Ammonia Water'],
    'Ammonium Hydroxide and Silver Oxide': [],
    'Ammonium Chloride': ['Ammonium Chloratum', 'Ammonium Chloridum', 'Ammonium Muriate', 'Sal Ammonia', 'Salmiac'],
    'Ammonium Nitrate': ['Ammonium Salt with Nitric Acid', 'Ammonium Saltpeter', 'Ammonium Salt and Nitric Acid'],
    'Ammonium Sulfate': ['Diammonium Salt with Sulfuric Acid'],
    'Antimony': ['Antimony Powder', 'Antimony Salt'],
    'Arsenic': [],
    'Arsenic Pentafluoride and Potassium Methoxide in Trichlorotrifluoroethane': [],
    'Barium Chloride': ['Barium Chloride Anhydrous', 'Barium Dichloride Anhydrous'],
    'Barium Chloride Dihydrate': ['Barium Dichloride Dihydrate'],
    'Benzene': ['Benzine', 'Benzol'],
    'Beryllium': [],
    'Beryllium Dihydride': [],
    'Bromine': [],
    'Bromine Pentafluoride': [],
    'Bromine Trichloride': [],
    'Carbon Tetrachloride': [],
    'Chlorine Trifluoride and Carbon': [],
    'Chlorine': [],
    'Chlorine Dioxide': [],
    'Chlorine Trifluoride': [],
    'Chloroform': ['Trichloromethane'],
    'Chloroform and Sodium Methoxide': [],
    'Chloroform-methanol': [],
    'Citric Acid': ['2-Hydroxy-1,2,3-propanetricarboxylic Acid'],
    'Copper Sulfate Pentahydrate': ['Blue Vitriol', 'Copper (II) Sulfate Pentahydrate'],
    'Copper Chloride': ['Cupric Chloride Dihydrate', 'Copper Chloride Dihydrate', 'Coppertrace'],
    'Copper Oxide': ['Cupric Oxide', 'Copper (II) Oxide'],
    'Cuprous Chloride': [],
    '3,5-Dinitrosalicylic Acid': ['2-hydroxy-3,5-dinitrobenzoic Acid'],
    'Ethanol': ['Absolute Ethanol', 'Ethyl Alcohol', 'Ethyl Alcohol (200 Proof)', 'Anhydrous Ethyl Alcohol', 'Carbinol'],
    'Ethyl Alcohol and Hydrogen Peroxide': ['Ethyl Alchohol and Hydrogen Peroxide'],
    'Methyl Alcohol': [],
    'Formaldehyde': ['Formalin', 'Formaldehyde (37% Solution)'],
    'Formic Acid': ['Formic Acid (85%)', 'FormicAcid, 85Percent, F.C.C'],
    'Glucose': ['D-Glucose', 'Dextrose (Anhydrous)', 'Dextrose'],
    'Glycerin': ['1,2,3-Propanetriol'],
    'Hydrogen Peroxide': ['Hydrogen Peroxide (30%)'],
    'Alcohols and Hydrogen Peroxide': [],
    '1-Phenyl-2-Methylpropyl Alcohol and Hydrogen Peroxide': ['Dimenthylbenzylcarbinol and Hydrogen Peroxide'],
    'Hydrogen Peroxide and Sulfuric Acid': [],
    'Iodine': [],
    'Iodine and Methanol and Mercuric Oxide': ['Ethanol and Methanol and Mercuric Oxide'],
    'Iodine Bromide': [],
    'Iodine Heptafluroide': [],
    'Iron': ['Iron Powder'],
    'Iron Oxide': [],
    'Ferrous Sulfate': ['Ferrous Sulfate Dried Powder', 'Ferrous Sulfate Hydrate'],
    'Ferrous Ammonium Sulfate': ['Ammonium Iron (II) Sulfate, Hexahydrate', 'Di-ammonium (II) Sulfate Hexahydrate', 'Ferrous Ammonium Sulfate Hexahydrate'],
    'Lactose': ['beta-d-galactopyranosyl-o-4D-glucopyrannose', 'Lactose (Anhydrous)'],
    'Lauric Acid': ['ABL', 'Dodecanoic Acid', 'Dodecylic Acid', 'Laurostearic Acid', 'Neo-fat12', 'Neo-fat12-43', 'Vulvic Acid', 'n-Dodecanoic Acid'],
    'Magnesium Oxide': ['Calcined Brucite', 'Magnesia', 'Magnesium Oxide Heavy Powder'],
    'Magnesium Sulfate': ['Magnesium Sulfate (Anhydrous)'],
    'Melamine': ['2,4,6-Triamino-s-Triazine'],
    'Mercuric Chloride': ['Bichloride of Mercury', 'Calochlor'],
    'Naphthalene': [],
    '1,5-Dinitronaphthalene And Sulfur': [],
    'Nitric Acid': [],
    'Indane and Nitric Acid': [],
    'Oxalic Acid': ['Oxalic Acid (Anhydrous)', 'Ethanedionic Acid', 'Ethanedoic Acid'],
    'Phosphorus Pentoxide': ['Di-phosphorus Pentoxide'],
    'Polyethylene Glycol 400': ['PEG400', 'PEG-8', 'Poly(oxy-1,2-ethanediyl).alpha.-hydro-.omega.-hydroxy-'],
    'Polysorbate 80': ['Polyethylene Oxide Sorbitan Mono-oleate', 'Polyoxyethylene 20 Sorbitan Monooleate', 'Polyoxyethylene Sorbitan Monooleate', 'Polyoxyethylene Sorbitan Oleate', 'Sorbitan Mono-9-otadecenoate Poly(Oxy-1,2-ethanediyl) Derivatives', 'Sorethytanop20cpMonooleate', 'TWEEN80'],
    'Potassium Dichromate': ['Bichromate of Potash'],
    'Potassium Phthalate': ['1,2-Benzenedicarboxylic Acid Monopotassium Salt', 'Potassium Bitphthlate', 'Pthalic Acid Monopotassium Salt', 'Hydrogen Potassium Pthalate'],
    'Potassium Phosphate Monobasic': ['Monopotassium Phosphate', 'PhosphoricAcid,MonopotassiumSalt', 'Potassium Dihydrogen Phospate'],
    'Potassium Phosphate Dibasic': ['Dipotassium Phosphate'],
    'Pyrogallic Acid': ['1,2,3-Benzenetriol', '1,2,3-Trihydroxybenzene'],
    'Salicylic Acid': ['2-Hydroxybenzoic Acid'],
    'Sodium Azide': ['Hydrazoic Acid, Sodium Salt', 'Smite'],
    'Sodium Bisulfite': ['Hydrogen Sulfite Sodium', 'Monosodium Salt Sulfurous Acid', 'Monosodium Sulfite', 'Sodium Acid Sulfite', 'Sodium Hydrogen Sulfite', 'Sodium Sulhydrate'],
    'Sodium Hydroxide': ['Caustic Soda'],
    'Sodium Lauryl Sulfate': ['Sodium Dodecyl Sulfate', 'Sulfuric Acid, Monododecyl Ester, Sodium Salt'],
    'Sodium Phosphate Dibasic': ['Dibasic Sodium Phosphate', 'Disodium Hydrogen Phosphate', 'Disodium Monohydrogen Phosphate', 'Disodium Orthophosphate', 'Disodium Phosphoric Acid', 'Phosphoric Acid, Disodium Salt', 'Soda Phosphate', 'Sodium Hydrogen Phosphate', 'Sodium Monohydrogen Phosphate'],
    'Sodium Thiosulfate': ['Ametox, Antichlor'],
    'Sodium Thiosulfate Pentahydrate': [],
    'Sulfuric Acid': ['Oil of Vitriol'],
    'Triethanolamine': ['Ethanol,2,2,2-nitrilotris', 'Tri(2-hydroxyethyl)amine', 'Trolamine'],
    'Tris': ['2-Amino-2-(hydroxymethyl)propane-1,3-diol Hydrochloride', 'Tris(hydroxymethyl)methylamine'],
    'Vinyl Acetate': ['Vinyl Acetate Monomer'],
    'Zinc Acetate': ['Zinc Diacetate, Dihydrate'],
    'Zinc': ['Zinc Metal', 'Zin', 'Zinc Metal Sheets', 'Zinc Metal Shot', 'Zinc Metal Strips'],
    'Acetyl Chloride': [],
    'Acetylene': [],
    'Acrylic Acid': [],
    'Allyl Chloride': ['Ally Chloride'],
    'Anilinobenzene': ['Diphenylamine'],
    'Benzalkonium Chloride': [],
    'Buffer Solution (pH 4.00)': [],
    'Carbon Dioxide': [],
    'Chlorosulfonic Acid': [],
    'Chromic Acid': [],
    'Chromic Oxide': [],
    'Chromium Trioxide': [],
    'Chromyl Chloride': [],
    'Cobalt Oxide': ['Cobal Oxide'],
    'Cumene': [],
    'Cyanuric Chloride': [],
    'Cyclopentadiene': [],
    'Diborane': [],
    'Dibromoethane': [],
    'Dichloroethyl Ether': [],
    'Dichloromethane': [],
    'Dihydrogen Monoxide': ['Water', 'Dihydrogen Oxide'],
    'Diisobutylene': [],
    'Dimanganese Heptoxide': [],
    'Dimethyl Sulfate': [],
    'Dioxane': [],
    'Disilane': [],
    'Disulfur Dichloride': [],
    'Ethylene Diamine': ['Ethlenediamine'],
    'Ethylene Glycol': [],
    'Ethylene Glycol Monoethyl Ether Acetate': [],
    'Ethylene Imine': ['Ethyleneimine', 'Ehtyleneimine'],
    'Ethylene Oxide': ['Ehtylene Oxide', 'Ehtylene Oxide and Heat'],
    'Ammonium Thiosulfate': [],
    'Water': ['Dihydrogen Monoxide', 'Dihydrogen Oxide']
};

 constructor() {}

  getAliases(): { [key: string]: string[] } {
    return this.chemicalAliases;
  }

  getMainChemicalName(name: string): string {
    const normalizedInput = this.normalizeChemicalName(name);
    
    for (const [mainName, aliases] of Object.entries(this.chemicalAliases)) {
      const normalizedMain = this.normalizeChemicalName(mainName);
      if (normalizedMain === normalizedInput) return mainName;
      
      for (const alias of aliases) {
        if (this.normalizeChemicalName(alias) === normalizedInput) {
          return mainName;
        }
      }
    }
    return name;
  }

  private normalizeChemicalName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  getAllPossibleNamesForChemical(chemicalName: string): string[] {
    const allNames = new Set<string>();
    allNames.add(chemicalName);
    const directAliases = this.chemicalAliases[chemicalName] || [];
    directAliases.forEach(alias => allNames.add(alias));

    for (const [mainName, aliases] of Object.entries(this.chemicalAliases)) {
      if (aliases.some(alias => alias.toLowerCase() === chemicalName.toLowerCase())) {
        allNames.add(mainName);
        aliases.forEach(alias => allNames.add(alias));
        break;
      }
    }

    if (chemicalName.includes(',')) {
      const parts = chemicalName.split(',').map(part => part.trim());
      allNames.add(parts.join(' '));
      allNames.add(parts.reverse().join(' '));
      allNames.add(parts[0]);
      if (parts[1]) allNames.add(parts[1]);
    }

    if (chemicalName.includes('(') || chemicalName.includes('[')) {
      const cleanName = chemicalName.replace(/[\[\]()]/g, '').trim();
      allNames.add(cleanName);
      
      const bracketContent = chemicalName.match(/\[([^\]]+)\]/);
      if (bracketContent) {
        allNames.add(bracketContent[1]);
      }
      
      const parenContent = chemicalName.match(/\(([^)]+)\)/);
      if (parenContent) {
        allNames.add(parenContent[1]);
      }
    }

    if (chemicalName.includes('..')) {
      const withComma = chemicalName.replace('..', ', ');
      allNames.add(withComma);
      const withSpace = chemicalName.replace('..', ' ');
      allNames.add(withSpace);
    }

    return Array.from(allNames);
  }
}