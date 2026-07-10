export interface GenerationOptions {
  style: string;
  aspectRatio: string;
  imageSize: string;
}

export interface StyleOption {
  id: string;
  name: string;
  description: string;
  icon?: any; // We'll pass Lucide icons
}
