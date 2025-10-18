export interface BlockedExtension {
  ext_id?: number;
  name: string;
  blocked: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface BlockedExtensionResponse {
  extensions: BlockedExtension[];
  count: number;
}
