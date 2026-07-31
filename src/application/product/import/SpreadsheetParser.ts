export interface SpreadsheetParser {
  parseFile(file: File): Promise<Record<string, unknown>[]>
}
