/** Resumo de um save no terminal. Uso: npm run inspect -- caminho/do/CmMgrC... */
import { readFileSync } from 'node:fs';
import { readSave } from '../src/lib/save';

const file = process.argv[2];
if (!file) throw new Error('Informe o caminho do save');
const s = readSave(new Uint8Array(readFileSync(file)));
const teams = new Map(s.tables.teams!.map((t) => [t.teamid as number, t.teamname as string]));
const players = new Map(s.tables.players!.map((p) => [p.playerid as number, p]));
const me = s.userTeamId;
console.log(`Slot: ${s.slotName}`);
console.log(`Time do usuário: ${me} ${me != null ? teams.get(me) : ''}`);
const squad = s.tables.teamplayerlinks!.filter((l) => l.teamid === me).map((l) => players.get(l.playerid as number)!);
console.log(`Elenco: ${squad.length} jogadores, OVR médio ${(squad.reduce((a, p) => a + (p.overallrating as number), 0) / squad.length).toFixed(1)}`);
for (const [stage, rows] of s.standings) {
  if (!rows.some((r) => r.teamId === me && r.played > 0)) continue;
  console.log(`\nClassificação (fase ${stage}):`);
  rows.forEach((r, i) => console.log(`${String(i + 1).padStart(2)}. ${(teams.get(r.teamId) ?? r.teamId).toString().padEnd(26)} J${r.played} V${r.won} E${r.drawn} D${r.lost} ${r.goalsFor}:${r.goalsAgainst}  ${r.points} pts`));
}
