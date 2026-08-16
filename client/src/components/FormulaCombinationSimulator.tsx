import { FlaskConical, Minus, Plus, Send, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import {
  formatProfileValues,
  simulateFormulaCombination,
  type SimulationHerb,
} from "@/lib/formulaSimulation";
import { buildDoseStudyRows } from "@/lib/formulaDoseProfiles";
import { weightStandards, type WeightStandard } from "@/lib/ancientMeasures";

type FormulaOption = {
  id: number;
  name: string;
  sourceTitle: string;
  slug: string;
  ingredients: string;
};

export function FormulaCombinationSimulator({
  formulas,
  herbs,
  onSendToDecoction,
  weightStandardId,
  onWeightStandardChange,
}: {
  formulas: FormulaOption[];
  herbs: SimulationHerb[];
  onSendToDecoction: (ingredients: string[]) => void;
  weightStandardId: WeightStandard["id"];
  onWeightStandardChange: (value: WeightStandard["id"]) => void;
}) {
  const [formulaId, setFormulaId] = useState("");
  const [added, setAdded] = useState<string[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [herbQuery, setHerbQuery] = useState("");
  const activeFormula = formulas.find(formula => String(formula.id) === formulaId);
  const baseIngredients = useMemo(() => {
    if (!activeFormula) return [];
    try {
      return JSON.parse(activeFormula.ingredients) as string[];
    } catch {
      return [];
    }
  }, [activeFormula]);
  const simulation = useMemo(
    () =>
      simulateFormulaCombination({
        baseIngredients,
        added,
        removed,
        herbs,
      }),
    [added, baseIngredients, herbs, removed]
  );
  const doseStudy = useMemo(() => activeFormula ? buildDoseStudyRows({ formulaSlug: activeFormula.slug, simulatedIngredients: simulation.simulatedIngredients, standardId: weightStandardId }) : undefined, [activeFormula, simulation.simulatedIngredients, weightStandardId]);
  const candidates = useMemo(() => {
    const keyword = herbQuery.trim();
    return herbs
      .filter(herb =>
        !baseIngredients.includes(herb.name) &&
        !added.includes(herb.name) &&
        (!keyword || `${herb.name} ${herb.aliases ?? ""} ${herb.category ?? ""}`.includes(keyword))
      )
      .slice(0, 8);
  }, [added, baseIngredients, herbQuery, herbs]);

  const resetMods = () => {
    setAdded([]);
    setRemoved([]);
    setHerbQuery("");
  };

  if (!formulas.length || !herbs.length) {
    return (
      <section className="formula-simulator formula-simulator-empty" aria-label="经方组合与加减影响模拟器">
        <FlaskConical size={20} />
        <div><h2>经方组合与加减影响模拟</h2><p>正在读取方剂与本草索引。目录加载完成后可在此进行学习性组合对比。</p></div>
      </section>
    );
  }

  return (
    <section className="formula-simulator" aria-label="经方组合与加减影响模拟器">
      <header className="formula-simulator-head">
        <div><span>组合实验台</span><h2>经方组合与加减影响模拟</h2><p>在已编目的方剂与本草索引中增减药味，观察药性索引与特殊煎煮核对项如何变化。</p></div>
        <FlaskConical size={27} strokeWidth={1.25} />
      </header>
      <p className="formula-simulator-notice">{simulation.notice}</p>
      <div className="formula-simulator-controls">
        <label><span>基底方剂</span><select value={formulaId} onChange={event => { setFormulaId(event.target.value); resetMods(); }}><option value="">请选择一首目录方剂</option>{formulas.map(formula => <option key={formula.id} value={formula.id}>{formula.name} · {formula.sourceTitle}</option>)}</select></label>
        <label><span>衡重口径</span><select value={weightStandardId} onChange={event => onWeightStandardChange(event.target.value as WeightStandard["id"])}>{weightStandards.map(standard => <option value={standard.id} key={standard.id}>{standard.label}</option>)}</select></label>
        {activeFormula ? <p><b>{activeFormula.name}</b><span>{activeFormula.sourceTitle}</span></p> : <p>选择基底方剂后，方中药味会出现在下方，可逐味标记为“暂不纳入”。</p>}
      </div>

      {activeFormula ? <>
        <div className="simulator-ingredients">
          <section><h3>原方药味</h3><div className="simulator-chip-list">{simulation.baseIngredients.map(name => <button type="button" key={name} className={removed.includes(name) ? "is-removed" : ""} onClick={() => setRemoved(current => current.includes(name) ? current.filter(item => item !== name) : current.concat(name))}><Minus size={13} />{name}<small>{removed.includes(name) ? "暂不纳入" : "移出对比"}</small></button>)}</div></section>
          <section><h3>拟加药味</h3><label className="simulator-herb-search"><SlidersHorizontal size={15} /><input value={herbQuery} onChange={event => setHerbQuery(event.target.value)} placeholder="从本草目录筛选药味" /></label>{candidates.length ? <div className="simulator-candidates">{candidates.map(herb => <button type="button" key={herb.id} onClick={() => { setAdded(current => current.concat(herb.name)); setHerbQuery(""); }}><Plus size={13} /><b>{herb.name}</b><small>{herb.category ?? "未分类"} · {herb.nature ?? "药性待核"}</small></button>)}</div> : <p className="simulator-empty-note">{herbQuery ? "没有相符的未选药味。" : "输入药名、别名或类别后，从目录中选择药味。"}</p>}<div className="simulator-added-list">{simulation.added.map(name => <button type="button" key={name} onClick={() => setAdded(current => current.filter(item => item !== name))}><Minus size={13} />{name}<span>取消加入</span></button>)}</div></section>
        </div>

        <section className="simulation-result" aria-live="polite">
          <div className="simulation-result-head"><div><span>模拟组合</span><h3>{simulation.simulatedIngredients.length ? simulation.simulatedIngredients.join(" · ") : "当前组合未保留药味"}</h3></div><button type="button" onClick={() => onSendToDecoction(simulation.simulatedIngredients)} disabled={!simulation.simulatedIngredients.length}><Send size={14} />带入煎煮研读提示</button></div>
          <div className="simulation-change-summary"><p><b>加入</b>{simulation.added.length ? simulation.added.join("、") : "无"}</p><p><b>暂不纳入</b>{simulation.removed.length ? simulation.removed.join("、") : "无"}</p><p><b>特殊煎煮候选</b>{simulation.decoctionCandidates.predecoctionCandidates.length || simulation.decoctionCandidates.lateAdditionCandidates.length ? `${simulation.decoctionCandidates.predecoctionCandidates.length ? `核对先煎：${simulation.decoctionCandidates.predecoctionCandidates.join("、")}` : ""}${simulation.decoctionCandidates.predecoctionCandidates.length && simulation.decoctionCandidates.lateAdditionCandidates.length ? "；" : ""}${simulation.decoctionCandidates.lateAdditionCandidates.length ? `核对后下：${simulation.decoctionCandidates.lateAdditionCandidates.join("、")}` : ""}` : "未识别到候选项；仍需核对处方或药房标注"}</p></div>
          <div className="simulation-profile-grid"><ProfileCard label="原方药味" profile={simulation.baseProfile} /><ProfileCard label="模拟组合" profile={simulation.simulatedProfile} /></div>
          {doseStudy ? <DoseStudyCard doseStudy={doseStudy} standardId={weightStandardId} /> : null}
        </section>
      </> : null}
    </section>
  );
}

function ProfileCard({ label, profile }: { label: string; profile: ReturnType<typeof simulateFormulaCombination>["baseProfile"] }) {
  return <article><h4>{label}</h4><p><b>{profile.total}</b> 味药材 <small>（其中 {profile.indexed} 味已在本草索引中匹配）</small></p><dl><div><dt>类别</dt><dd>{formatProfileValues(profile.categories)}</dd></div><div><dt>药性</dt><dd>{formatProfileValues(profile.natures)}</dd></div><div><dt>五味</dt><dd>{formatProfileValues(profile.tastes)}</dd></div><div><dt>归经</dt><dd>{formatProfileValues(profile.meridians)}</dd></div></dl></article>;
}

function DoseStudyCard({ doseStudy, standardId }: { doseStudy: ReturnType<typeof buildDoseStudyRows>; standardId: WeightStandard["id"] }) {
  const standard = weightStandards.find(item => item.id === standardId) ?? weightStandards[0];
  if (!doseStudy.profile) return <section className="simulation-dose-card"><h4>古制数量与衡重对照</h4><p>该目录方剂尚未建立可回到公开页面核对的原典数量档案；新增药味不会自动推定数量。</p></section>;
  return <section className="simulation-dose-card"><div><span>古制数量对照</span><h4>药味剂量与衡重联动</h4><p>{doseStudy.profile.transcriptionNote}</p></div><p className="simulation-dose-boundary">当前口径：{standard.label}。质量、容量与枚数分别呈现，不能合并为总剂量；模拟加入药味不自动赋予数量。</p><div className="simulation-dose-list">{doseStudy.rows.map(item => <article key={item.herb}><b>{item.herb}</b><span>{item.ancient}</span><strong>{item.converted}</strong></article>)}</div>{doseStudy.missingIngredients.length ? <p className="simulation-dose-missing">未纳入原典数量档案：{doseStudy.missingIngredients.join("、")}。这些药味只参与本草索引对比，不产生数量。</p> : null}<a href={doseStudy.profile.sourceUrl} target="_blank" rel="noreferrer">返回{doseStudy.profile.sourceLabel}核对</a></section>;
}
