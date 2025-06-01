import * as THREE from 'three';
import { GUI } from 'lil-gui';

export interface TextureConfig {
  texture1Name: string;
  texture2Name: string;
}

export class TextureUI {
  private gui: GUI;
  private config: TextureConfig;
  private onTextureUpdate: (texture: THREE.DataTexture, index: 1 | 2) => void;
  private folderTexture1: GUI;
  private folderTexture2: GUI;
  private dropZone1: HTMLElement | null = null;
  private dropZone2: HTMLElement | null = null;

  constructor(
    gui: GUI,
    onTextureUpdate: (texture: THREE.DataTexture, index: 1 | 2) => void
  ) {
    this.gui = gui;
    this.onTextureUpdate = onTextureUpdate;
    
    this.config = {
      texture1Name: 'No file selected',
      texture2Name: 'No file selected'
    };

    this.folderTexture1 = this.gui.addFolder('Texture 1');
    this.folderTexture2 = this.gui.addFolder('Texture 2');
    this.setupUI();
    this.setupDragAndDrop();
  }

  private setupUI(): void {
    // Texture 1 controls
    this.setupTextureControls(this.folderTexture1, 1);
    
    // Texture 2 controls
    this.setupTextureControls(this.folderTexture2, 2);
  }

  private setupTextureControls(folder: GUI, index: 1 | 2): void {
    const configKey = index === 1 ? 'texture1Name' : 'texture2Name';
    
    // Display current file name
    folder.add(this.config, configKey)
      .name('Current File')
      .disable()
      .listen();

    // File upload button
    const fileUpload = {
      upload: () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            this.loadTextureFromFile(file, index);
          }
        };
        input.click();
      }
    };
    
    folder.add(fileUpload, 'upload').name('📁 Choose File');

    /* // Create drop zone info
    const dropInfo = {
      info: '💡 Drag & drop image here'
    };
    folder.add(dropInfo, 'info').name('').disable(); */
  }

  private setupDragAndDrop(): void {
    // Wait for GUI to be rendered
    setTimeout(() => {
      const guiElement = this.gui.domElement;
      
      // Find folder elements
      const folders = guiElement.querySelectorAll('.folder');
      if (folders.length >= 2) {
        this.setupDropZone(folders[0] as HTMLElement, 1);
        this.setupDropZone(folders[1] as HTMLElement, 2);
      }
    }, 100);
  }

  private setupDropZone(folderElement: HTMLElement, index: 1 | 2): void {
    // Style the folder for drag and drop
    folderElement.style.position = 'relative';
    
    // Create drop zone overlay
    const dropZone = document.createElement('div');
    dropZone.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(100, 200, 255, 0.1);
      border: 2px dashed transparent;
      pointer-events: none;
      transition: all 0.2s ease;
      opacity: 0;
    `;
    
    folderElement.appendChild(dropZone);
    
    if (index === 1) {
      this.dropZone1 = dropZone;
    } else {
      this.dropZone2 = dropZone;
    }

    // Drag and drop events
    folderElement.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.style.opacity = '1';
      dropZone.style.borderColor = 'rgba(100, 200, 255, 0.8)';
      dropZone.style.background = 'rgba(100, 200, 255, 0.2)';
    });

    folderElement.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.style.opacity = '0';
      dropZone.style.borderColor = 'transparent';
      dropZone.style.background = 'rgba(100, 200, 255, 0.1)';
    });

    folderElement.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      dropZone.style.opacity = '0';
      dropZone.style.borderColor = 'transparent';
      dropZone.style.background = 'rgba(100, 200, 255, 0.1)';

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
          this.loadTextureFromFile(file, index);
        } else {
          console.error('Please drop an image file');
        }
      }
    });
  }

  private loadTextureFromFile(file: File, index: 1 | 2): void {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const texture = this.createTextureFromImage(img);
        this.onTextureUpdate(texture, index);
        
        // Update file name display
        if (index === 1) {
          this.config.texture1Name = file.name;
        } else {
          this.config.texture2Name = file.name;
        }

        // Flash effect on successful load
        const dropZone = index === 1 ? this.dropZone1 : this.dropZone2;
        if (dropZone) {
          dropZone.style.background = 'rgba(100, 255, 100, 0.3)';
          dropZone.style.opacity = '1';
          setTimeout(() => {
            dropZone.style.opacity = '0';
            dropZone.style.background = 'rgba(100, 200, 255, 0.1)';
          }, 300);
        }
      };
      
      img.onerror = () => {
        console.error(`Failed to load image file: ${file.name}`);
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => {
      console.error(`Failed to read file: ${file.name}`);
    };
    
    reader.readAsDataURL(file);
  }

  private createTextureFromImage(img: HTMLImageElement): THREE.DataTexture {
    // Create canvas to extract image data
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }

    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Create THREE.DataTexture
    const texture = new THREE.DataTexture(
      data.data,
      data.width,
      data.height,
      THREE.RGBAFormat
    );
    texture.needsUpdate = true;
    
    return texture;
  }

  public dispose(): void {
    this.folderTexture1.destroy();
    this.folderTexture2.destroy();
  }
}