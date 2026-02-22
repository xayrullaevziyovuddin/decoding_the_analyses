export interface ImageFile {
  name: string;
  dataUrl: string;
  type: string;
}

export interface User {
  id: string; // Using email as the unique ID
  name: string;
  email: string;
  picture?: string; // Optional, as email auth doesn't provide a picture
}

export interface Biomarker {
  name: string;
  value: string;
  unit: string;
  status: 'Normal' | 'High' | 'Low' | 'Abnormal' | 'Detected' | 'Not Detected';
  normalRange: string;
  description: string;
  possibleCauses: string;
}

export interface AnalysisResult {
  title: string;
  biomarkers: Biomarker[];
}

export interface AnalysisHistoryItem {
  id: string; // Using ISO string date as a unique ID
  date: string;
  result: AnalysisResult;
  originalFile: ImageFile;
}