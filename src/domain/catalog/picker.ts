/** Aulas do catálogo para o seletor do novo estudo, agrupadas por matéria. */
export interface CatalogPickItem {
  id: string;
  title: string;
  summary: string | null;
  minutes: number;
}

export interface CatalogPickerGroup {
  discipline: string;
  topics: CatalogPickItem[];
}
