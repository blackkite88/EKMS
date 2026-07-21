// Industrial dataset generator for AssetBrain — Bharat Process Industries.
// Produces ~110-130 cross-referenced files with the P-101 RCA storyline,
// seeded compliance gaps, and ABAC access tags. Run: node gen-industrial.mjs <dataDir>
import fs from 'fs';
import path from 'path';

const OUT = process.argv[2];
if (!OUT) { console.error('usage: node gen-industrial.mjs <dataDir>'); process.exit(1); }
const dirs = ['equipment', 'workorders', 'inspections', 'failures', 'manuals', 'procedures', 'regulations', 'logs'];
for (const d of dirs) fs.mkdirSync(path.join(OUT, d), { recursive: true });

const wj = (sub, name, obj) => fs.writeFileSync(path.join(OUT, sub, name), JSON.stringify(obj, null, 2));
const fm = (a) => `---\naccess:\n  department: ${a.department}\n  unit: ${a.unit}\n  min_clearance: ${a.min_clearance}\n  sensitivity: ${a.sensitivity}\n---\n`;
const wm = (sub, name, access, body) => fs.writeFileSync(path.join(OUT, sub, name), fm(access) + body + '\n');

// ── ABAC presets (department / unit / clearance / sensitivity) ──
const AC = {
  maintPub:  { department: 'maintenance', unit: 'unit-2', min_clearance: 1, sensitivity: 'public' },
  maint:     { department: 'maintenance', unit: 'unit-2', min_clearance: 2, sensitivity: 'internal' },
  maintU1:   { department: 'maintenance', unit: 'unit-1', min_clearance: 2, sensitivity: 'internal' },
  eng:       { department: 'engineering', unit: 'unit-2', min_clearance: 4, sensitivity: 'internal' },
  engConf:   { department: 'engineering', unit: 'unit-2', min_clearance: 4, sensitivity: 'confidential' },
  safety:    { department: 'safety',      unit: 'unit-2', min_clearance: 5, sensitivity: 'restricted' },
  reg:       { department: 'compliance',  unit: 'all',    min_clearance: 1, sensitivity: 'public' },
  ops:       { department: 'operations',  unit: 'unit-2', min_clearance: 1, sensitivity: 'public' },
};

// ══════════════════════════════════════════════════════════════════
// EQUIPMENT (18) — the hubs everything hangs off
// ══════════════════════════════════════════════════════════════════
const equipment = [
  { id:'P-101', name:'Crude Feed Pump P-101', type:'Centrifugal Pump', unit:'Unit-2', service:'Hydrocarbon (crude feed)', manufacturer:'KSB', model:'RPH-200', installed:'2018-03-12', rated_flow_m3h:220, criticality:'High', access:AC.maint,
    description:'Primary crude feed pump for Unit-2 atmospheric distillation. Mechanical seal, anti-friction bearings. Subject to OISD-STD-106 vibration monitoring.',
    related_manuals:['MAN-KSB-RPH200'], governed_by:['OISD-STD-106'] },
  { id:'P-102', name:'Crude Feed Pump P-102 (standby)', type:'Centrifugal Pump', unit:'Unit-2', service:'Hydrocarbon (crude feed)', manufacturer:'KSB', model:'RPH-200', installed:'2018-03-12', rated_flow_m3h:220, criticality:'High', access:AC.maint,
    description:'Standby crude feed pump, identical to P-101. Experienced a bearing failure in 2023 (see FAIL-2023-07).',
    related_manuals:['MAN-KSB-RPH200'], governed_by:['OISD-STD-106'] },
  { id:'HX-205', name:'Crude Preheat Exchanger HX-205', type:'Shell & Tube Heat Exchanger', unit:'Unit-2', service:'Crude/product heat exchange', manufacturer:'Alfa Laval', model:'STX-4000', installed:'2017-11-01', criticality:'Medium', access:AC.maint,
    description:'Shell-and-tube preheat exchanger. Subject to thickness monitoring per OISD-STD-130.', governed_by:['OISD-STD-130'] },
  { id:'C-301', name:'Recycle Gas Compressor C-301', type:'Reciprocating Compressor', unit:'Unit-3', service:'Hydrogen recycle', manufacturer:'Burckhardt', model:'RC-900', installed:'2019-06-20', criticality:'High', access:AC.maintU1, governed_by:['OISD-STD-106'] },
  { id:'V-410', name:'HP Separator Vessel V-410', type:'Pressure Vessel', unit:'Unit-4', service:'High-pressure separation', manufacturer:'L&T', model:'PV-HP-410', installed:'2016-09-15', design_pressure_barg:85, criticality:'High', access:AC.eng,
    description:'High-pressure separator. Subject to PESO hydrotest every 4 years and OISD-STD-105 internal inspection.', governed_by:['PESO-SMPV-2016','OISD-STD-105'] },
  { id:'T-501', name:'Product Storage Tank T-501', type:'Storage Tank', unit:'Tank Farm', service:'Finished product storage', manufacturer:'BPI Fabrication', installed:'2015-01-10', criticality:'Medium', access:AC.ops, governed_by:['OISD-STD-129'] },
  { id:'P-210', name:'Reflux Pump P-210', type:'Centrifugal Pump', unit:'Unit-2', service:'Reflux', manufacturer:'KSB', model:'RPH-150', installed:'2018-05-22', criticality:'Medium', access:AC.maint, governed_by:['OISD-STD-106'] },
  { id:'P-215', name:'Bottoms Pump P-215', type:'Centrifugal Pump', unit:'Unit-2', service:'Column bottoms', manufacturer:'Flowserve', model:'FS-300', installed:'2019-02-14', criticality:'Medium', access:AC.maint, governed_by:['OISD-STD-106'] },
  { id:'HX-208', name:'Overhead Condenser HX-208', type:'Shell & Tube Heat Exchanger', unit:'Unit-2', service:'Overhead condensing', manufacturer:'Alfa Laval', model:'STX-3000', installed:'2017-11-01', criticality:'Medium', access:AC.maint, governed_by:['OISD-STD-130'] },
  { id:'C-302', name:'Instrument Air Compressor C-302', type:'Screw Compressor', unit:'Utilities', service:'Instrument air', manufacturer:'Atlas Copco', model:'GA-160', installed:'2020-01-08', criticality:'Medium', access:AC.maintU1 },
  { id:'V-411', name:'LP Separator Vessel V-411', type:'Pressure Vessel', unit:'Unit-4', service:'Low-pressure separation', manufacturer:'L&T', model:'PV-LP-411', installed:'2016-09-15', design_pressure_barg:12, criticality:'Medium', access:AC.eng, governed_by:['PESO-SMPV-2016'] },
  { id:'T-502', name:'Slop Tank T-502', type:'Storage Tank', unit:'Tank Farm', service:'Slop collection', manufacturer:'BPI Fabrication', installed:'2015-01-10', criticality:'Low', access:AC.ops, governed_by:['OISD-STD-129'] },
  { id:'P-220', name:'Cooling Water Pump P-220', type:'Centrifugal Pump', unit:'Utilities', service:'Cooling water', manufacturer:'Kirloskar', model:'KP-400', installed:'2020-03-01', criticality:'Medium', access:AC.maintU1, governed_by:['OISD-STD-106'] },
  { id:'F-101', name:'Crude Heater F-101', type:'Fired Heater', unit:'Unit-2', service:'Crude heating', manufacturer:'Thermax', model:'FH-5000', installed:'2016-12-01', criticality:'High', access:AC.eng, governed_by:['OISD-STD-113'] },
  { id:'K-401', name:'Makeup Gas Compressor K-401', type:'Centrifugal Compressor', unit:'Unit-4', service:'Makeup hydrogen', manufacturer:'Siemens', model:'STC-500', installed:'2019-06-20', criticality:'High', access:AC.eng, governed_by:['OISD-STD-106'] },
  { id:'HX-401', name:'Feed/Effluent Exchanger HX-401', type:'Shell & Tube Heat Exchanger', unit:'Unit-4', service:'Feed/effluent', manufacturer:'Alfa Laval', model:'STX-5000', installed:'2016-09-15', criticality:'Medium', access:AC.eng, governed_by:['OISD-STD-130'] },
  { id:'P-230', name:'Product Transfer Pump P-230', type:'Centrifugal Pump', unit:'Unit-2', service:'Product transfer', manufacturer:'KSB', model:'RPH-150', installed:'2018-05-22', criticality:'Low', access:AC.maint, governed_by:['OISD-STD-106'] },
  { id:'V-420', name:'Amine Absorber V-420', type:'Pressure Vessel', unit:'Unit-4', service:'Amine treating', manufacturer:'L&T', model:'PV-ABS-420', installed:'2016-09-15', design_pressure_barg:70, criticality:'High', access:AC.eng, governed_by:['PESO-SMPV-2016','OISD-STD-105'] },
];
for (const e of equipment) wj('equipment', `${e.id}.json`, e);
console.log('equipment:', equipment.length);

// ══════════════════════════════════════════════════════════════════
// FAILURES (10) — incl. the P-101 hero + P-102 pattern
// ══════════════════════════════════════════════════════════════════
const failures = [
  { id:'FAIL-2025-03', equipment_id:'P-101', title:'P-101 Bearing Seizure — 14h Unplanned Downtime', date:'2025-03-18', severity:'High', downtime_hours:14, access:AC.maint,
    failure_mode:'Bearing seizure', immediate_cause:'Drive-end bearing seized due to progressive overheating and loss of clearance.',
    description:'Crude Feed Pump P-101 tripped on high vibration and motor overload at 03:12. Inspection found the drive-end bearing seized. Root-cause investigation traced elevated vibration back to a mechanical seal replacement (WO-2041) after which shaft alignment was not verified — a step required by the OEM manual (MAN-KSB-RPH200) but ABSENT from the site SOP (SOP-SEAL-REPL). Post-maintenance vibration inspection INS-311 recorded elevated readings that were logged but not escalated. Operating logs (LOG-2025-03) show P-101 was also run above rated flow. This failure is a repeat of the P-102 bearing failure of 2023 (FAIL-2023-07), whose corrective action (update the SOP) was never implemented.',
    contributing_factors:['Shaft misalignment after seal replacement (WO-2041)','Elevated vibration not escalated (INS-311)','Operation above rated flow (LOG-2025-03)'],
    root_cause:'Systemic: SOP-SEAL-REPL omits the mandatory post-seal-replacement alignment verification required by MAN-KSB-RPH200. Identical to the unresolved root cause of FAIL-2023-07 on P-102.',
    related_workorders:['WO-2041','WO-2050'], related_inspections:['INS-311'], related_manuals:['MAN-KSB-RPH200'], related_procedures:['SOP-SEAL-REPL'], related_logs:['LOG-2025-03'], similar_to:['FAIL-2023-07'] },
  { id:'FAIL-2023-07', equipment_id:'P-102', title:'P-102 Bearing Failure (2023)', date:'2023-08-05', severity:'High', downtime_hours:11, access:AC.maint,
    failure_mode:'Bearing failure', immediate_cause:'Drive-end bearing failure following seal replacement.',
    description:'Standby crude pump P-102 suffered a bearing failure two months after a mechanical seal replacement. Investigation concluded the shaft was left misaligned after the seal job. Corrective action raised: update SOP-SEAL-REPL to mandate alignment verification. This action was recorded but never closed out — the SOP was not updated, setting up the later P-101 failure (FAIL-2025-03).',
    contributing_factors:['Shaft misalignment after seal replacement'],
    root_cause:'Misalignment after seal replacement; SOP lacked an alignment-verification step.',
    corrective_action:'Update SOP-SEAL-REPL (NOT COMPLETED)', related_manuals:['MAN-KSB-RPH200'], related_procedures:['SOP-SEAL-REPL'], similar_to:['FAIL-2025-03'] },
  { id:'FAIL-2024-02', equipment_id:'HX-208', title:'HX-208 Tube Leak', date:'2024-04-11', severity:'Medium', downtime_hours:6, access:AC.maint,
    failure_mode:'Tube leak', immediate_cause:'Tube wall thinning from corrosion.', description:'Overhead condenser HX-208 developed a tube leak. Thickness inspection INS-220 had flagged accelerated thinning. Tubes plugged as interim measure.',
    root_cause:'Corrosion-driven tube wall thinning.', related_inspections:['INS-220'] },
  { id:'FAIL-2024-09', equipment_id:'C-302', title:'C-302 Air Compressor Trip', date:'2024-10-02', severity:'Low', downtime_hours:3, access:AC.maintU1,
    failure_mode:'High temperature trip', immediate_cause:'Fouled aftercooler.', description:'Instrument air compressor C-302 tripped on discharge temperature due to a fouled aftercooler. Cleaned and restored.', root_cause:'Aftercooler fouling.' },
  { id:'FAIL-2023-11', equipment_id:'P-215', title:'P-215 Seal Leak', date:'2023-12-14', severity:'Low', downtime_hours:4, access:AC.maint,
    failure_mode:'Seal leak', immediate_cause:'Mechanical seal wear.', description:'Bottoms pump P-215 mechanical seal leak. Seal replaced under WO-1802.', root_cause:'Normal seal wear.', related_workorders:['WO-1802'] },
  { id:'FAIL-2024-06', equipment_id:'F-101', title:'F-101 Tube Skin Temperature Excursion', date:'2024-07-20', severity:'Medium', downtime_hours:0, access:AC.eng,
    failure_mode:'Localized overheating', immediate_cause:'Flame impingement from a fouled burner.', description:'Crude heater F-101 experienced a tube skin temperature excursion. No downtime; burner cleaned. Thermographic inspection INS-405 recommended.', root_cause:'Burner fouling causing flame impingement.', related_inspections:['INS-405'] },
  { id:'FAIL-2025-01', equipment_id:'P-220', title:'P-220 Cooling Water Pump Cavitation', date:'2025-01-28', severity:'Low', downtime_hours:2, access:AC.maintU1,
    failure_mode:'Cavitation', immediate_cause:'Suction strainer blockage.', description:'Cooling water pump P-220 cavitation from a blocked suction strainer. Strainer cleaned.', root_cause:'Suction strainer blockage.' },
  { id:'FAIL-2023-04', equipment_id:'V-411', title:'V-411 Relief Valve Passing', date:'2023-05-09', severity:'Medium', downtime_hours:0, access:AC.eng,
    failure_mode:'Relief valve passing', immediate_cause:'Valve seat damage.', description:'LP separator V-411 pressure relief valve found passing during inspection. Valve overhauled.', root_cause:'PSV seat damage.' },
  { id:'FAIL-2024-12', equipment_id:'K-401', title:'K-401 Vibration Alarm', date:'2024-12-30', severity:'Medium', downtime_hours:0, access:AC.eng,
    failure_mode:'High vibration', immediate_cause:'Coupling imbalance.', description:'Makeup gas compressor K-401 vibration alarm. Coupling rebalanced under WO-2610.', root_cause:'Coupling imbalance.', related_workorders:['WO-2610'] },
  { id:'FAIL-2023-09', equipment_id:'HX-205', title:'HX-205 Fouling-Related Efficiency Loss', date:'2023-10-18', severity:'Low', downtime_hours:0, access:AC.maint,
    failure_mode:'Fouling', immediate_cause:'Crude-side fouling.', description:'Preheat exchanger HX-205 showed declining heat transfer from fouling. Cleaned during turnaround.', root_cause:'Crude-side fouling.' },
];
for (const f of failures) wj('failures', `${f.id}.json`, f);
console.log('failures:', failures.length);

// ══════════════════════════════════════════════════════════════════
// WORK ORDERS (28)
// ══════════════════════════════════════════════════════════════════
const wos = [];
const addWO = (o) => wos.push(o);
// The critical ones in the P-101 story:
addWO({ id:'WO-2041', equipment_id:'P-101', title:'P-101 Mechanical Seal Replacement', type:'Corrective', priority:'High', status:'Completed', date:'2025-02-10', technician:'R. Kulkarni', access:AC.maint,
  description:'Replaced leaking mechanical seal on P-101 per SOP-SEAL-REPL. Seal replaced, pump returned to service. NOTE: SOP-SEAL-REPL does not include a post-replacement shaft alignment check; alignment was not verified. Later identified as the root cause of failure FAIL-2025-03.',
  procedure:'SOP-SEAL-REPL', related_failures:['FAIL-2025-03'] });
addWO({ id:'WO-2050', equipment_id:'P-101', title:'P-101 Bearing Replacement (post-failure)', type:'Breakdown', priority:'Critical', status:'Completed', date:'2025-03-19', technician:'R. Kulkarni', access:AC.maint,
  description:'Emergency bearing replacement after P-101 seizure (FAIL-2025-03). Shaft alignment verified and corrected. Recommend updating SOP-SEAL-REPL.', related_failures:['FAIL-2025-03'] });
addWO({ id:'WO-1802', equipment_id:'P-215', title:'P-215 Seal Replacement', type:'Corrective', priority:'Medium', status:'Completed', date:'2023-12-15', technician:'S. Iyer', access:AC.maint, description:'Replaced mechanical seal on bottoms pump P-215 (FAIL-2023-11).', related_failures:['FAIL-2023-11'] });
addWO({ id:'WO-2610', equipment_id:'K-401', title:'K-401 Coupling Rebalance', type:'Corrective', priority:'Medium', status:'Completed', date:'2024-12-31', technician:'A. Bose', access:AC.eng, description:'Rebalanced coupling on makeup gas compressor K-401 (FAIL-2024-12).', related_failures:['FAIL-2024-12'] });
// Routine / filler WOs across equipment:
const routineWO = [
  ['WO-2101','P-210','Reflux Pump P-210 Bearing Greasing','Preventive','Completed','2025-01-15','S. Iyer',AC.maint],
  ['WO-2102','HX-205','HX-205 Cleaning (turnaround)','Preventive','Completed','2024-11-20','Team-A',AC.maint],
  ['WO-2103','C-301','C-301 Valve Inspection','Preventive','Completed','2025-02-01','A. Bose',AC.maintU1],
  ['WO-2104','V-410','V-410 External Visual Inspection','Preventive','Completed','2024-10-10','QA Team',AC.eng],
  ['WO-2105','T-501','T-501 Roof Seal Check','Preventive','Completed','2025-01-05','Ops Team',AC.ops],
  ['WO-2106','P-215','P-215 Vibration Check','Preventive','Completed','2025-02-20','S. Iyer',AC.maint],
  ['WO-2107','HX-208','HX-208 Tube Plugging (interim)','Corrective','Completed','2024-04-12','Team-A',AC.maint],
  ['WO-2108','C-302','C-302 Aftercooler Cleaning','Corrective','Completed','2024-10-03','A. Bose',AC.maintU1],
  ['WO-2109','F-101','F-101 Burner Cleaning','Corrective','Completed','2024-07-21','Team-B',AC.eng],
  ['WO-2110','P-220','P-220 Strainer Cleaning','Corrective','Completed','2025-01-29','P. Nair',AC.maintU1],
  ['WO-2111','V-411','V-411 PSV Overhaul','Corrective','Completed','2023-05-10','QA Team',AC.eng],
  ['WO-2112','P-101','P-101 Quarterly Lubrication','Preventive','Completed','2024-12-01','R. Kulkarni',AC.maint],
  ['WO-2113','P-102','P-102 Standby Test Run','Preventive','Completed','2025-01-10','R. Kulkarni',AC.maint],
  ['WO-2114','HX-401','HX-401 Thickness Survey Prep','Preventive','Completed','2024-09-15','QA Team',AC.eng],
  ['WO-2115','K-401','K-401 Lube Oil Change','Preventive','Completed','2024-11-01','A. Bose',AC.eng],
  ['WO-2116','P-230','P-230 Seal Inspection','Preventive','Completed','2025-02-05','S. Iyer',AC.maint],
  ['WO-2117','V-420','V-420 Internal Inspection','Preventive','Completed','2024-08-20','QA Team',AC.eng],
  ['WO-2118','T-502','T-502 Level Gauge Calibration','Preventive','Completed','2025-01-12','Ops Team',AC.ops],
  ['WO-2119','HX-208','HX-208 Thickness Re-survey','Preventive','Open','2025-03-25','QA Team',AC.maint],
  ['WO-2120','P-210','P-210 Alignment Check','Preventive','Open','2025-03-28','S. Iyer',AC.maint],
  ['WO-2121','C-301','C-301 Vibration Monitoring','Preventive','Open','2025-03-30','A. Bose',AC.maintU1],
  ['WO-2122','F-101','F-101 Thermographic Survey','Preventive','Open','2025-03-22','Team-B',AC.eng],
  ['WO-2123','P-220','P-220 Overhaul','Corrective','In Progress','2025-03-15','P. Nair',AC.maintU1],
  ['WO-2124','V-410','V-410 Hydrotest Prep','Preventive','Open','2025-04-01','QA Team',AC.eng],
];
for (const [id,eq,title,type,status,date,tech,access] of routineWO)
  addWO({ id, equipment_id:eq, title, type, priority:'Medium', status, date, technician:tech, access, description:`${title} for ${eq}.` });
for (const w of wos) wj('workorders', `${w.id}.json`, w);
console.log('workorders:', wos.length);

// ══════════════════════════════════════════════════════════════════
// INSPECTIONS (22) — MD with frontmatter; INS-311 is the smoking gun
// ══════════════════════════════════════════════════════════════════
const inspections = [
  { id:'INS-311', eq:'P-101', access:AC.maint, body:`# Vibration Inspection INS-311 — P-101\n\n**Equipment:** Crude Feed Pump P-101\n**Date:** 2025-02-14 (post seal replacement WO-2041)\n**Type:** Vibration monitoring (OISD-STD-106)\n\n## Readings\n| Point | Reading (mm/s RMS) | Alarm | Trip |\n|-------|-----|-------|------|\n| Drive-end bearing | 7.8 | 4.5 | 7.1 |\n| Non-drive-end | 5.2 | 4.5 | 7.1 |\n\n## Finding\nDrive-end vibration (7.8 mm/s) EXCEEDS both alarm (4.5) and trip (7.1) thresholds following the mechanical seal replacement under WO-2041. Pattern indicates possible shaft misalignment. **Logged but not escalated to maintenance engineering.** This elevated reading preceded bearing seizure FAIL-2025-03.\n\n**Related:** WO-2041, FAIL-2025-03, P-101, OISD-STD-106` },
  { id:'INS-220', eq:'HX-208', access:AC.maint, body:`# Thickness Inspection INS-220 — HX-208\n\n**Date:** 2024-03-01\n**Type:** Ultrasonic thickness (OISD-STD-130)\n\n## Finding\nAccelerated tube-wall thinning detected on overhead condenser HX-208. Minimum measured thickness approaching retirement limit. Preceded tube leak FAIL-2024-02.\n\n**Related:** FAIL-2024-02, HX-208, OISD-STD-130` },
  { id:'INS-405', eq:'F-101', access:AC.eng, body:`# Thermographic Inspection INS-405 — F-101\n\n**Date:** 2024-07-25\n**Type:** Thermography\n\n## Finding\nLocalized hot spot on crude heater F-101 radiant tubes from flame impingement (burner fouling). Related to excursion FAIL-2024-06. Burner cleaning recommended.\n\n**Related:** FAIL-2024-06, F-101` },
];
// compliance-relevant + routine inspections
const inspRoutine = [
  ['INS-201','P-102',AC.maint,'Vibration','2025-01-05','Normal','OISD-STD-106','All readings within limits.'],
  ['INS-202','P-210',AC.maint,'Vibration','2024-10-10','Normal','OISD-STD-106','Within limits. NOTE: next due 2025-01-10 — currently OVERDUE.'],
  ['INS-203','P-215',AC.maint,'Vibration','2024-11-15','Normal','OISD-STD-106','Within limits. Next due 2025-02-15 — currently OVERDUE.'],
  ['INS-204','P-230',AC.maint,'Vibration','2024-09-01','Normal','OISD-STD-106','Within limits. Next due 2024-12-01 — currently OVERDUE.'],
  ['INS-205','HX-205',AC.maint,'Thickness','2024-11-20','Normal','OISD-STD-130','Thickness acceptable post-cleaning.'],
  ['INS-206','V-410',AC.eng,'Internal','2020-10-15','Normal','OISD-STD-105','Internal inspection satisfactory. PESO hydrotest last done 2020 — 4-year interval EXCEEDED (due 2024).'],
  ['INS-207','V-411',AC.eng,'Internal','2022-06-01','Normal','OISD-STD-105','Satisfactory.'],
  ['INS-208','V-420',AC.eng,'Internal','2024-08-20','Normal','OISD-STD-105','Satisfactory.'],
  ['INS-209','C-301',AC.maintU1,'Vibration','2025-02-01','Normal','OISD-STD-106','Within limits.'],
  ['INS-210','K-401',AC.eng,'Vibration','2024-12-30','Elevated','OISD-STD-106','Elevated, coupling rebalanced (WO-2610).'],
  ['INS-211','P-220',AC.maintU1,'Vibration','2025-01-29','Normal','OISD-STD-106','Post-strainer-cleaning readings normal.'],
  ['INS-212','HX-401',AC.eng,'Thickness','2024-09-15','Normal','OISD-STD-130','Within limits.'],
  ['INS-213','T-501',AC.ops,'Settlement','2025-01-05','Normal','OISD-STD-129','Tank settlement within limits.'],
  ['INS-214','F-101',AC.eng,'Thickness','2024-06-01','Normal','OISD-STD-130','Tube thickness acceptable.'],
  ['INS-215','P-101',AC.maint,'Vibration','2024-11-01','Normal','OISD-STD-106','Baseline before seal replacement — normal.'],
  ['INS-216','HX-208',AC.maint,'Thickness','2025-02-01','Caution','OISD-STD-130','Continued thinning; re-survey scheduled WO-2119.'],
  ['INS-217','C-302',AC.maintU1,'Vibration','2024-10-05','Normal','OISD-STD-106','Post-cleaning normal.'],
  ['INS-218','V-411',AC.eng,'PSV','2023-05-09','Fail','OISD-STD-105','PSV found passing, overhauled (WO-2111).'],
  ['INS-219','T-502',AC.ops,'Visual','2025-01-12','Normal','OISD-STD-129','Visual inspection satisfactory.'],
];
for (const [id,eq,access,type,date,result,reg,finding] of inspRoutine)
  inspections.push({ id, eq, access, body:`# ${type} Inspection ${id} — ${eq}\n\n**Date:** ${date}\n**Type:** ${type} (${reg})\n**Result:** ${result}\n\n## Finding\n${finding}\n\n**Related:** ${eq}, ${reg}` });
for (const i of inspections) wm('inspections', `${i.id}.md`, i.access, i.body);
console.log('inspections:', inspections.length);

// ══════════════════════════════════════════════════════════════════
// MANUALS (12) — MAN-KSB-RPH200 holds the alignment requirement
// ══════════════════════════════════════════════════════════════════
const manuals = [
  { id:'MAN-KSB-RPH200', access:AC.maintPub, body:`# OEM Manual — KSB RPH-200 Centrifugal Pump\n\n**Applies to:** P-101, P-102\n\n## Mechanical Seal Replacement (Section 7.4)\nAfter replacing the mechanical seal, the following steps are **MANDATORY**:\n1. Reinstall the seal per torque spec.\n2. **Verify shaft-to-driver alignment using a dial indicator or laser tool. Misalignment after seal work is the leading cause of premature bearing failure.**\n3. Record alignment readings in the maintenance log.\n\n> ⚠️ WARNING: Skipping the post-seal alignment verification (Step 2) will lead to accelerated bearing wear and seizure.\n\n## Bearing Life\nRated L10 bearing life assumes alignment within 0.05 mm. Operation above rated flow (220 m³/h) further reduces bearing life.\n\n**Related:** P-101, P-102, SOP-SEAL-REPL` },
  { id:'MAN-ALFA-STX', access:AC.maintPub, body:`# OEM Manual — Alfa Laval STX Series Exchangers\n\n**Applies to:** HX-205, HX-208, HX-401\n\n## Thickness Monitoring\nInspect tube wall thickness per OISD-STD-130. Retirement thickness: 2.0 mm. Clean crude-side fouling each turnaround.\n\n**Related:** HX-205, HX-208, HX-401` },
  { id:'MAN-LT-PV', access:AC.maintPub, body:`# OEM Manual — L&T Pressure Vessels\n\n**Applies to:** V-410, V-411, V-420\n\n## Inspection\nInternal inspection per OISD-STD-105. Hydrotest per PESO SMPV Rules every 4 years. Verify PSV set pressure annually.\n\n**Related:** V-410, V-411, V-420, PESO-SMPV-2016` },
  { id:'MAN-BURCK-RC900', access:AC.maintPub, body:`# OEM Manual — Burckhardt RC-900 Compressor\n\n**Applies to:** C-301\n\n## Maintenance\nValve inspection every 8000 hours. Vibration monitoring per OISD-STD-106.\n\n**Related:** C-301` },
  { id:'MAN-THERMAX-FH', access:AC.maintPub, body:`# OEM Manual — Thermax FH-5000 Fired Heater\n\n**Applies to:** F-101\n\n## Operation\nMonitor tube skin temperatures. Clean burners to prevent flame impingement. Thermographic survey annually.\n\n**Related:** F-101` },
  { id:'MAN-FLOW-FS300', access:AC.maintPub, body:`# OEM Manual — Flowserve FS-300 Pump\n\n**Applies to:** P-215\n\n## Seals\nMechanical seal service life ~2 years. Verify alignment after seal replacement.\n\n**Related:** P-215` },
];
const manFiller = [
  ['MAN-SIEMENS-STC','K-401','Siemens STC-500 Compressor — vibration monitoring per OISD-STD-106; lube oil analysis quarterly.'],
  ['MAN-ATLAS-GA','C-302','Atlas Copco GA-160 — aftercooler cleaning quarterly; monitor discharge temperature.'],
  ['MAN-KIRLOSKAR-KP','P-220','Kirloskar KP-400 — clean suction strainer monthly; monitor for cavitation.'],
  ['MAN-BPI-TANK','T-501','BPI Tank — settlement survey annually per OISD-STD-129; roof seal inspection.'],
  ['MAN-KSB-RPH150','P-210','KSB RPH-150 — same seal-replacement alignment requirement as RPH-200. Applies to P-210, P-230.'],
  ['MAN-LT-ABS','V-420','L&T Amine Absorber — internal inspection per OISD-STD-105; monitor for amine corrosion.'],
];
for (const [id,eq,txt] of manFiller)
  manuals.push({ id, access:AC.maintPub, body:`# OEM Manual — ${id}\n\n**Applies to:** ${eq}\n\n${txt}\n\n**Related:** ${eq}` });
for (const m of manuals) wm('manuals', `${m.id}.md`, m.access, m.body);
console.log('manuals:', manuals.length);

// ══════════════════════════════════════════════════════════════════
// PROCEDURES (14) — SOP-SEAL-REPL is the flawed one (missing alignment step)
// ══════════════════════════════════════════════════════════════════
const procedures = [
  { id:'SOP-SEAL-REPL', access:AC.maintPub, body:`# SOP-SEAL-REPL — Mechanical Seal Replacement\n\n**Applies to:** Centrifugal pumps (P-101, P-102, P-210, P-215, P-230)\n**Revision:** 3 (2021-06-01)\n\n## Steps\n1. Isolate and depressurise the pump. Lockout/tagout.\n2. Remove coupling guard and disconnect coupling.\n3. Remove the old mechanical seal.\n4. Install the new seal per OEM torque spec.\n5. Reconnect coupling and replace guard.\n6. Restore pump to service and monitor for leaks.\n\n> ⚠️ GAP: This SOP does NOT include the post-replacement shaft alignment verification that the OEM manual (MAN-KSB-RPH200, Section 7.4) marks as MANDATORY. This omission was identified as the root cause of both FAIL-2023-07 (P-102) and FAIL-2025-03 (P-101). A corrective action to update this SOP was raised after FAIL-2023-07 but never completed.\n\n**Related:** MAN-KSB-RPH200, FAIL-2025-03, FAIL-2023-07, P-101, P-102` },
  { id:'SOP-VIB-MON', access:AC.maintPub, body:`# SOP-VIB-MON — Vibration Monitoring\n\n**Per:** OISD-STD-106\n\n## Requirement\nRotating equipment in hydrocarbon service shall have vibration readings taken every 3 months. Readings exceeding alarm thresholds MUST be escalated to maintenance engineering within 24 hours.\n\n**Related:** OISD-STD-106, INS-311` },
  { id:'SOP-PSV-TEST', access:AC.maintPub, body:`# SOP-PSV-TEST — Pressure Relief Valve Testing\n\nTest PSV set pressure annually per OISD-STD-105. Overhaul any valve found passing.\n\n**Related:** OISD-STD-105, V-411` },
];
const procFiller = [
  ['SOP-LOTO','Lockout/Tagout procedure for isolating equipment before maintenance.'],
  ['SOP-HOTWORK','Hot work permit procedure per Factory Act safety requirements.'],
  ['SOP-CONFINED','Confined space entry procedure for vessels and tanks.'],
  ['SOP-THICKNESS','Ultrasonic thickness survey procedure per OISD-STD-130.'],
  ['SOP-HYDROTEST','Pressure vessel hydrotest procedure per PESO SMPV Rules.'],
  ['SOP-ALIGN','Shaft alignment procedure using laser alignment tools.'],
  ['SOP-LUBE','Lubrication schedule and procedure for rotating equipment.'],
  ['SOP-TANK-INSP','Storage tank inspection procedure per OISD-STD-129.'],
  ['SOP-BURNER','Fired heater burner cleaning and inspection procedure.'],
  ['SOP-COMPRESSOR','Reciprocating compressor valve inspection procedure.'],
  ['SOP-EMERGENCY','Emergency shutdown procedure for Unit-2.'],
];
for (const [id,txt] of procFiller)
  procedures.push({ id, access:AC.maintPub, body:`# ${id}\n\n${txt}` });
for (const p of procedures) wm('procedures', `${p.id}.md`, p.access, p.body);
console.log('procedures:', procedures.length);

// ══════════════════════════════════════════════════════════════════
// REGULATIONS (10) — real OISD/PESO/Factory Act (public), lightly excerpted
// ══════════════════════════════════════════════════════════════════
const regulations = [
  { id:'OISD-STD-106', access:AC.reg, body:`# OISD-STD-106 — Process Design and Operating Philosophy on Rotating Equipment\n\n*Oil Industry Safety Directorate (real standard, excerpted).*\n\n## Vibration Monitoring Requirement\nRotating equipment (pumps, compressors) in hydrocarbon service shall be subject to periodic vibration monitoring. **Recommended interval: every 3 months** for critical/high-criticality machines. Readings exceeding OEM alarm limits require investigation and corrective action.\n\n**Governs:** P-101, P-102, P-210, P-215, P-230, C-301, K-401, P-220\n**Compliance basis:** interval = 90 days` },
  { id:'PESO-SMPV-2016', access:AC.reg, body:`# PESO — Static and Mobile Pressure Vessels (Unfired) Rules, 2016\n\n*Petroleum and Explosives Safety Organisation (real rules, excerpted).*\n\n## Periodic Testing\nEvery unfired pressure vessel shall undergo **hydrostatic testing at intervals not exceeding 4 years**, and internal/external inspection as specified. A valid test certificate must be maintained.\n\n**Governs:** V-410, V-411, V-420\n**Compliance basis:** hydrotest interval = 4 years (1460 days)` },
  { id:'OISD-STD-105', access:AC.reg, body:`# OISD-STD-105 — Work Permit System & Inspection of Pressure Vessels\n\n## Requirement\nPressure vessels shall undergo internal inspection at defined intervals; pressure relief valves tested annually.\n\n**Governs:** V-410, V-411, V-420` },
  { id:'OISD-STD-130', access:AC.reg, body:`# OISD-STD-130 — Inspection of Heat Exchangers & Piping\n\n## Requirement\nHeat exchangers subject to periodic ultrasonic thickness monitoring; tubes retired below minimum thickness.\n\n**Governs:** HX-205, HX-208, HX-401` },
  { id:'OISD-STD-129', access:AC.reg, body:`# OISD-STD-129 — Inspection of Storage Tanks\n\n## Requirement\nStorage tanks subject to periodic settlement surveys and integrity inspection.\n\n**Governs:** T-501, T-502` },
  { id:'OISD-STD-113', access:AC.reg, body:`# OISD-STD-113 — Fired Heaters\n\n## Requirement\nFired heaters subject to tube skin temperature monitoring and periodic thermographic survey.\n\n**Governs:** F-101` },
  { id:'FACTORY-ACT-M', access:AC.reg, body:`# Factory Act, 1948 — Maintenance & Safety (excerpted)\n\n## Requirement\nEmployers shall maintain plant and machinery in a safe condition and keep records of maintenance and inspection. Hazardous work requires documented safe systems of work.\n\n**Applies to:** all equipment` },
  { id:'FACTORY-ACT-H', access:AC.reg, body:`# Factory Act, 1948 — Hazardous Processes (excerpted)\n\n## Requirement\nHazardous processes require worker safety measures, emergency procedures, and incident reporting.\n\n**Applies to:** Unit-2, Unit-4` },
  { id:'OISD-STD-116', access:AC.reg, body:`# OISD-STD-116 — Fire Protection Facilities\n\n## Requirement\nProcess units shall maintain fire protection systems and conduct periodic testing.\n\n**Applies to:** all units` },
  { id:'OISD-GDN-178', access:AC.reg, body:`# OISD-GDN-178 — Risk Based Inspection\n\n## Guidance\nInspection intervals may be optimised using risk-based methodology considering criticality and damage mechanisms.\n\n**Applies to:** all equipment` },
];
for (const r of regulations) wm('regulations', `${r.id}.md`, r.access, r.body);
console.log('regulations:', regulations.length);

// ══════════════════════════════════════════════════════════════════
// LOGS (6) — LOG-2025-03 shows P-101 above rated flow
// ══════════════════════════════════════════════════════════════════
const logs = [
  { id:'LOG-2025-03', access:AC.ops, body:`Operating Log Summary — Unit-2 — March 2025\n\nP-101 Crude Feed Pump:\n- Avg flow: 238 m3/h (rated 220 m3/h) — running ~8% ABOVE rated flow through early March\n- Discharge pressure: normal\n- 2025-03-18 03:12 — TRIP on high vibration + motor overload. Bearing seizure (FAIL-2025-03).\n\nNote: sustained operation above rated flow contributed to bearing loading. Related: P-101, FAIL-2025-03.` },
  { id:'LOG-2025-02', access:AC.ops, body:`Operating Log Summary — Unit-2 — February 2025\n\nP-101 returned to service 2025-02-10 after seal replacement (WO-2041). Flow trending high (230-240 m3/h). Vibration inspection INS-311 taken 2025-02-14. Related: P-101, WO-2041, INS-311.` },
  { id:'LOG-2025-01', access:AC.ops, body:`Operating Log Summary — Unit-2 — January 2025\n\nNormal operations. HX-208 flagged for thickness re-survey. Related: HX-208.` },
  { id:'LOG-2024-12', access:AC.ops, body:`Operating Log Summary — Unit-4 — December 2024\n\nK-401 vibration alarm 2024-12-30, coupling rebalanced. Related: K-401, FAIL-2024-12.` },
  { id:'LOG-2024-07', access:AC.ops, body:`Operating Log Summary — Unit-2 — July 2024\n\nF-101 tube skin temperature excursion 2024-07-20. Burner cleaned. Related: F-101, FAIL-2024-06.` },
  { id:'LOG-2023-08', access:AC.ops, body:`Operating Log Summary — Unit-2 — August 2023\n\nP-102 bearing failure 2023-08-05 (FAIL-2023-07) two months after seal replacement. Related: P-102, FAIL-2023-07.` },
];
for (const l of logs) fs.writeFileSync(path.join(OUT, 'logs', `${l.id}.txt`), fm(l.access) + l.body + '\n');
console.log('logs:', logs.length);

console.log('\nDONE — industrial dataset generated');
