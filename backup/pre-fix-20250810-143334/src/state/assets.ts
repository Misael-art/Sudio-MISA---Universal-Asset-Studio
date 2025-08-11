import { create } from 'zustand';

export interface AssetsState {
  decodedSprites: ImageData[];
  importedSprites: ImageData[];
  selectedImportedIndex: number | null;
  setDecodedSprites: (sprites: ImageData[]) => void;
  addImportedSprites: (sprites: ImageData[]) => void;
  resetImportedSprites: () => void;
  setSelectedImportedIndex: (index: number | null) => void;
  updateImportedSprite: (index: number, image: ImageData) => void;
}

export const useAssetsStore = create<AssetsState>((set) => ({
  decodedSprites: [],
  importedSprites: [],
  selectedImportedIndex: null,
  setDecodedSprites: (sprites) => set({ decodedSprites: sprites }),
  addImportedSprites: (sprites) => set((s) => ({ importedSprites: [...s.importedSprites, ...sprites] })),
  resetImportedSprites: () => set({ importedSprites: [] }),
  setSelectedImportedIndex: (index) => set({ selectedImportedIndex: index }),
  updateImportedSprite: (index, image) => set((s) => {
    if (index < 0 || index >= s.importedSprites.length) return {} as any;
    const arr = s.importedSprites.slice();
    arr[index] = image;
    return { importedSprites: arr };
  }),
}));

