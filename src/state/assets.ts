import { create } from 'zustand';

// Implementando integração com sistema de assets existente (Zustand)
// Expandindo o store para suportar sprites editados e funcionalidades avançadas
// Seguindo as especificações da Fase 2 do Universal Asset Studio

export interface EditedSprite {
  id: string;
  originalIndex: number;
  imageData: ImageData;
  width: number;
  height: number;
  paletteIndex: number;
  lastModified: number;
  isModified: boolean;
}

export interface SpriteProject {
  id: string;
  name: string;
  sprites: EditedSprite[];
  createdAt: number;
  lastModified: number;
}

export interface AssetsState {
  // Sprites originais decodificados do Genesis Plus GX
  decodedSprites: ImageData[];
  
  // Sprites importados pelo usuário
  importedSprites: ImageData[];
  selectedImportedIndex: number | null;
  
  // Sprites editados no SpriteEditor
  editedSprites: EditedSprite[];
  
  // Projetos de sprites
  spriteProjects: SpriteProject[];
  currentProjectId: string | null;
  
  // Estado de edição
  isEditing: boolean;
  editingSprite: EditedSprite | null;
  
  // Métodos para sprites decodificados
  setDecodedSprites: (sprites: ImageData[]) => void;
  
  // Métodos para sprites importados
  addImportedSprites: (sprites: ImageData[]) => void;
  resetImportedSprites: () => void;
  setSelectedImportedIndex: (index: number | null) => void;
  updateImportedSprite: (index: number, image: ImageData) => void;
  
  // Métodos para sprites editados
  addEditedSprite: (sprite: Omit<EditedSprite, 'id' | 'lastModified' | 'isModified'>) => string;
  updateEditedSprite: (id: string, imageData: ImageData) => void;
  removeEditedSprite: (id: string) => void;
  getEditedSprite: (id: string) => EditedSprite | undefined;
  
  // Métodos para projetos
  createProject: (name: string) => string;
  loadProject: (id: string) => void;
  saveProject: () => void;
  deleteProject: (id: string) => void;
  
  // Métodos para estado de edição
  startEditing: (sprite: EditedSprite) => void;
  stopEditing: () => void;
  saveCurrentEdit: (imageData: ImageData) => void;
}

// Função utilitária para gerar IDs únicos
const generateId = () => `sprite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useAssetsStore = create<AssetsState>((set, get) => ({
  // Estado inicial
  decodedSprites: [],
  importedSprites: [],
  selectedImportedIndex: null,
  editedSprites: [],
  spriteProjects: [],
  currentProjectId: null,
  isEditing: false,
  editingSprite: null,
  
  // Métodos para sprites decodificados
  setDecodedSprites: (sprites) => set({ decodedSprites: sprites }),
  
  // Métodos para sprites importados
  addImportedSprites: (sprites) => set((s) => ({ importedSprites: [...s.importedSprites, ...sprites] })),
  resetImportedSprites: () => set({ importedSprites: [] }),
  setSelectedImportedIndex: (index) => set({ selectedImportedIndex: index }),
  updateImportedSprite: (index, image) => set((s) => {
    if (index < 0 || index >= s.importedSprites.length) return {} as any;
    const arr = s.importedSprites.slice();
    arr[index] = image;
    return { importedSprites: arr };
  }),
  
  // Métodos para sprites editados
  addEditedSprite: (spriteData) => {
    const id = generateId();
    const newSprite: EditedSprite = {
      ...spriteData,
      id,
      lastModified: Date.now(),
      isModified: false
    };
    
    set((s) => ({
      editedSprites: [...s.editedSprites, newSprite]
    }));
    
    return id;
  },
  
  updateEditedSprite: (id, imageData) => set((s) => ({
    editedSprites: s.editedSprites.map(sprite => 
      sprite.id === id 
        ? { ...sprite, imageData, lastModified: Date.now(), isModified: true }
        : sprite
    )
  })),
  
  removeEditedSprite: (id) => set((s) => ({
    editedSprites: s.editedSprites.filter(sprite => sprite.id !== id)
  })),
  
  getEditedSprite: (id) => {
    const state = get();
    return state.editedSprites.find(sprite => sprite.id === id);
  },
  
  // Métodos para projetos
  createProject: (name) => {
    const id = generateId();
    const newProject: SpriteProject = {
      id,
      name,
      sprites: [],
      createdAt: Date.now(),
      lastModified: Date.now()
    };
    
    set((s) => ({
      spriteProjects: [...s.spriteProjects, newProject],
      currentProjectId: id
    }));
    
    return id;
  },
  
  loadProject: (id) => {
    const state = get();
    const project = state.spriteProjects.find(p => p.id === id);
    if (project) {
      set({
        currentProjectId: id,
        editedSprites: [...project.sprites]
      });
    }
  },
  
  saveProject: () => {
    const state = get();
    if (!state.currentProjectId) return;
    
    set((s) => ({
      spriteProjects: s.spriteProjects.map(project => 
        project.id === s.currentProjectId
          ? { ...project, sprites: [...s.editedSprites], lastModified: Date.now() }
          : project
      )
    }));
  },
  
  deleteProject: (id) => set((s) => ({
    spriteProjects: s.spriteProjects.filter(p => p.id !== id),
    currentProjectId: s.currentProjectId === id ? null : s.currentProjectId
  })),
  
  // Métodos para estado de edição
  startEditing: (sprite) => set({
    isEditing: true,
    editingSprite: sprite
  }),
  
  stopEditing: () => set({
    isEditing: false,
    editingSprite: null
  }),
  
  saveCurrentEdit: (imageData) => {
    const state = get();
    if (state.editingSprite) {
      state.updateEditedSprite(state.editingSprite.id, imageData);
    }
  }
}));

