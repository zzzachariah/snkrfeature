export type UserRole = "user" | "admin";

export interface ShoeSpec {
  forefoot_midsole_tech?: string | null;
  heel_midsole_tech?: string | null;
  outsole_tech?: string | null;
  upper_tech?: string | null;
  cushioning_feel?: string | null;
  court_feel?: string | null;
  bounce?: string | null;
  stability?: string | null;
  traction?: string | null;
  fit?: string | null;
  containment?: string | null;
  support?: string | null;
  torsional_rigidity?: string | null;
  playstyle_summary?: string | null;
  story_summary?: string | null;
  tags?: string[];
}

export interface Shoe {
  id: string;
  slug: string;
  brand: string;
  shoe_name: string;
  model_line?: string | null;
  version_name?: string | null;
  release_year?: number | null;
  category?: string | null;
  player?: string | null;
  price?: number | null;
  weight?: string | null;
  spec: ShoeSpec;
}
