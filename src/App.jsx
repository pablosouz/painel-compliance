import React, { useState } from 'react';
import { 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  Download, 
  User, 
  Building, 
  Loader2, 
  FileText,
  RefreshCcw,
  ExternalLink,
  Info
} from 'lucide-react';

const SEARCH_KEYWORDS = `(CPI OR indiciado OR acusado OR "Polícia Federal" OR "Ministério Público" OR judiciário OR "bloqueio de bens" OR "ação penal" OR "processo penal" OR condenado OR violações OR multas OR "crime ambiental" OR cartel OR "processo administrativo" OR "lavagem de dinheiro" OR corrupção)`;

async function analyzeEntityWithN8N(entityName) {
  const webhookUrl = "http://localhost:5678/webhook-test/background-check";
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityName }) 
    });

    if (!response.ok) {
      throw new Error(`Erro na API do n8n: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error("Erro ao consultar o motor de busca local:", err);
    return {
      riscoEncontrado: false,
      resumo: "Erro ao conectar com o servidor local (n8n). Verifique se o workflow está ativo e escutando (Listen for test event).",
      detalhes: [],
      fontesEvidencia: [],
      sources: []
    };
  }
}

export default function BackgroundCheckApp() {
  const [step, setStep] = useState(1); 
  
  const [companyName, setCompanyName] = useState('');
  const [partnersInput, setPartnersInput] = useState('');
  const [preparerName, setPreparerName] = useState('');

  const [entities, setEntities] = useState([]);
  const [scanProgress, setScanProgress] = useState(0);
  const [isScanning, setIsScanning] = useState(false);

  const handleStartScan = async () => {
    if (!companyName.trim()) {
      alert("Por favor, insira o nome da empresa.");
      return;
    }

    const partnerList = partnersInput.split('\n').map(p => p.trim()).filter(p => p.length > 0);
    
    const processEntity = (rawText, defaultType) => {
      if (rawText.includes('-')) {
        const [namePart, ...typeParts] = rawText.split('-');
        return {
          name: namePart.trim(),
          type: typeParts.join('-').trim() || defaultType
        };
      }
      return {
        name: rawText,
        type: defaultType
      };
    };

    const parsedCompany = processEntity(companyName, 'Empresa Alvo');

    const initialEntities = [
      { id: 'emp-1', name: parsedCompany.name, type: parsedCompany.type, status: 'pending', result: null },
      ...partnerList.map((p, idx) => {
        const parsedPartner = processEntity(p, 'Sócio / Parte Relacionada');
        return {
          id: `part-${idx}`,
          name: parsedPartner.name,
          type: parsedPartner.type,
          status: 'pending',
          result: null
        }
      })
    ];

    setEntities(initialEntities);
    setStep(2);
    setIsScanning(true);
    setScanProgress(0);

    let currentEntities = [...initialEntities];
    
    for (let i = 0; i < currentEntities.length; i++) {
      currentEntities[i].status = 'scanning';
      setEntities([...currentEntities]);

      const result = await analyzeEntityWithN8N(currentEntities[i].name);
      
      currentEntities[i].status = 'completed';
      currentEntities[i].result = result;
      setEntities([...currentEntities]);
      setScanProgress(Math.round(((i + 1) / currentEntities.length) * 100));
    }

    setIsScanning(false);
    setStep(3);
  };

  const resetApp = () => {
    setCompanyName('');
    setPartnersInput('');
    setEntities([]);
    setScanProgress(0);
    setStep(1);
  };

  const handlePrint = () => {
    window.print();
  };

  const hasAnyRisk = entities.some(e => e.result?.riscoEncontrado);
  const currentDate = new Date().toLocaleDateString('pt-BR');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      
      <header className="bg-slate-900 text-white p-4 shadow-md print:hidden">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Search className="w-6 h-6 text-blue-400" />
            <h1 className="text-xl font-bold">Automated Background Check</h1>
          </div>
          {step === 3 && (
            <div className="flex gap-4">
              <button onClick={resetApp} className="flex items-center gap-2 text-sm hover:text-blue-300 transition-colors">
                <RefreshCcw className="w-4 h-4" /> Nova Busca
              </button>
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-md font-medium transition-colors"
              >
                <Download className="w-4 h-4" /> Exportar / Imprimir
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        
        {step === 1 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 max-w-2xl mx-auto mt-10">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <FileText className="w-6 h-6 text-slate-500" />
              Configurar Memorando
            </h2>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Preparador</label>
                <input 
                  type="text" 
                  value={preparerName}
                  onChange={(e) => setPreparerName(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Ex: Luana Costa"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Empresa Alvo (Cliente)</label>
                <div className="relative">
                  <Building className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full pl-10 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Ex: ALLOY METALS MINERACAO LTDA"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Sócios e Diretores (QSA)
                  <span className="text-xs text-slate-500 font-normal ml-2">- Um nome por linha. Use "-" para separar o cargo.</span>
                </label>
                <div className="relative">
                  <User className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
                  <textarea 
                    value={partnersInput}
                    onChange={(e) => setPartnersInput(e.target.value)}
                    rows={6}
                    className="w-full pl-10 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                    placeholder="Ex: GUILHERME TEIXEIRA CAIXETA - Conselheiro de Administração&#10;MARIA AUGUSTA DE SOUZA"
                  />
                </div>
              </div>

              <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm flex gap-3 items-start border border-blue-100">
                <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600" />
                <div>
                  <p className="font-semibold mb-1">Fórmula Booleana aplicada na Inteligência Artificial:</p>
                  <p className="text-blue-700/80 text-xs break-words font-mono">
                    "NOME DO ALVO" {SEARCH_KEYWORDS}
                  </p>
                </div>
              </div>

              <button 
                onClick={handleStartScan}
                className="w-full bg-slate-900 text-white font-semibold py-3.5 rounded-lg hover:bg-slate-800 transition-colors flex justify-center items-center gap-2 mt-4"
              >
                <Search className="w-5 h-5" />
                Iniciar Background Check Automático
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="max-w-3xl mx-auto mt-10">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
              <div className="relative w-24 h-24 mx-auto mb-6">
                <svg className="w-full h-full text-slate-200" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="100, 100" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#2563eb" strokeWidth="3" strokeDasharray={`${scanProgress}, 100`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-bold text-xl text-slate-700">
                  {scanProgress}%
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Analisando Inteligência de Dados...</h2>
              <p className="text-slate-500 mb-8">Consultando motores de busca via n8n local.</p>

              <div className="space-y-3 text-left">
                {entities.map(entity => (
                  <div key={entity.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50">
                    <div>
                      <span className="font-medium text-slate-700 truncate mr-4">{entity.name}</span>
                      <span className="text-xs text-slate-400 block">{entity.type}</span>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                      {entity.status === 'pending' && <span className="text-sm text-slate-400">Aguardando...</span>}
                      {entity.status === 'scanning' && <><Loader2 className="w-4 h-4 animate-spin text-blue-500" /><span className="text-sm text-blue-600 font-medium">Buscando...</span></>}
                      {entity.status === 'completed' && <><CheckCircle className="w-4 h-4 text-emerald-500" /><span className="text-sm text-emerald-600 font-medium">Concluído</span></>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div id="print-area" className="bg-white p-10 rounded-xl shadow-sm border border-slate-200 print:shadow-none print:border-none print:p-0">
            
            <div className="border-b-2 border-slate-900 pb-6 mb-8">
              <h1 className="text-3xl font-serif text-slate-900 mb-6 uppercase tracking-wider">Memorando de Investigação</h1>
              
              <div className="grid grid-cols-2 gap-y-3 text-sm text-slate-700 mb-6">
                <div><span className="font-bold mr-2">Cliente:</span> {companyName}</div>
                <div><span className="font-bold mr-2">Data-base:</span> {new Date().getFullYear()}</div>
                <div><span className="font-bold mr-2">Preparado por:</span> {preparerName}</div>
                <div><span className="font-bold mr-2">Data da Busca:</span> {currentDate}</div>
                <div><span className="font-bold mr-2">Ref:</span> Background Check</div>
              </div>

              <div className="space-y-4 text-sm text-slate-800 leading-relaxed">
                <div>
                  <h3 className="font-bold text-slate-900 uppercase">Objetivo</h3>
                  <p>Pesquisar sobre reputação, integridade da entidade, proprietários e/ou administração, que possam trazer riscos na aceitação do cliente.</p>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 uppercase">Procedimento</h3>
                  <p>A equipe realizou buscas (automatizadas com IA e indexadores web) e com o uso de palavras-chave nos seguintes indivíduos e empresas:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1 font-medium">
                    {entities.map(e => <li key={e.id}>{e.name} <span className="text-slate-500 font-normal text-xs ml-1">({e.type})</span></li>)}
                  </ul>
                  <p className="mt-3 font-semibold text-xs text-slate-600 bg-slate-100 p-2 rounded">
                    Palavras-chave pesquisadas:<br/> {SEARCH_KEYWORDS}
                  </p>
                  <p className="mt-2 text-xs italic">Fonte de pesquisa base: Google Search (via AI Grounding API / n8n)</p>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-bold text-slate-900 uppercase mb-6 border-b border-slate-200 pb-2">Resultados Individuais</h3>
              
              <div className="space-y-8">
                {entities.map(entity => (
                  <div key={entity.id} className="border border-slate-200 rounded-lg overflow-hidden break-inside-avoid">
                    <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-slate-900 text-lg uppercase">{entity.name}</h4>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{entity.type}</span>
                      </div>
                      <div className="print:hidden">
                        {entity.result?.riscoEncontrado 
                          ? <span className="flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold"><AlertTriangle className="w-3 h-3"/> Alerta</span>
                          : <span className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold"><CheckCircle className="w-3 h-3"/> Limpo</span>
                        }
                      </div>
                    </div>
                    
                    <div className="p-4 bg-white">
                      <div className="mb-4 bg-slate-50 p-3 rounded border border-slate-200 text-xs font-mono text-slate-600 break-words flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                        <div className="flex gap-2 items-start">
                          <Search className="w-4 h-4 flex-shrink-0 text-blue-500 mt-0.5" />
                          <span>"{entity.name}" {SEARCH_KEYWORDS}</span>
                        </div>
                        <a 
                          href={`https://www.google.com/search?q=${encodeURIComponent(`"${entity.name}" ${SEARCH_KEYWORDS}`)}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex-shrink-0 flex items-center gap-1 bg-white border border-slate-300 hover:bg-slate-100 px-3 py-1.5 rounded text-blue-600 font-sans font-semibold transition-colors print:hidden"
                          title="Abrir pesquisa real no Google"
                        >
                          <ExternalLink className="w-3 h-3" /> Ver Busca no Google
                        </a>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <p className={`text-sm leading-relaxed ${entity.result?.riscoEncontrado ? 'text-red-900 font-medium' : 'text-slate-700'}`}>
                            {entity.result?.resumo}
                          </p>
                        </div>

                        {entity.result?.riscoEncontrado && entity.result?.detalhes && entity.result.detalhes.length > 0 && (
                          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md">
                            <h5 className="text-red-800 text-xs font-bold uppercase mb-2">Apontamentos Encontrados:</h5>
                            <ul className="list-disc pl-5 text-sm text-red-900 space-y-1">
                              {entity.result.detalhes.map((det, idx) => (
                                <li key={idx}>{det}</li>
                              ))}
                            </ul>

                            {entity.result?.fontesEvidencia && entity.result.fontesEvidencia.length > 0 && (
                              <div className="mt-4 pt-3 border-t border-red-200">
                                <h6 className="text-red-800 text-xs font-bold uppercase mb-2 flex items-center gap-1">
                                  <ExternalLink className="w-3 h-3" /> Links das Evidências (Fontes)
                                </h6>
                                <ul className="space-y-2">
                                  {entity.result.fontesEvidencia.map((fonte, idx) => (
                                    <li key={`evid-${idx}`} className="text-sm bg-white p-2 rounded border border-red-100 shadow-sm">
                                      <a href={fonte.url} target="_blank" rel="noreferrer" className="text-blue-700 hover:text-blue-800 hover:underline flex flex-col">
                                        <span className="font-semibold leading-tight">{fonte.titulo || "Fonte Comprobatória"}</span>
                                        <span className="text-xs text-red-500/80 truncate mt-0.5">{fonte.url}</span>
                                      </a>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        {entity.result?.sources && entity.result.sources.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-slate-100">
                            <h5 className="text-slate-500 text-xs font-bold uppercase mb-2 flex items-center gap-1">
                              <ExternalLink className="w-3 h-3" /> Principais Fontes (Grounding)
                            </h5>
                            <ul className="space-y-2">
                              {entity.result.sources.slice(0, 3).map((source, idx) => (
                                <li key={idx} className="text-sm">
                                  <a href={source.uri} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex flex-col">
                                    <span className="font-medium line-clamp-1">{source.title}</span>
                                    <span className="text-xs text-slate-400 truncate">{source.uri}</span>
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`p-6 rounded-lg border-2 break-inside-avoid ${hasAnyRisk ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <h3 className={`text-xl font-bold uppercase mb-3 ${hasAnyRisk ? 'text-red-800' : 'text-emerald-800'}`}>
                Conclusão do Memorando
              </h3>
              
              {hasAnyRisk ? (
                <p className="text-sm text-red-900 leading-relaxed">
                  Com base nos resultados automatizados de busca em fontes públicas, a equipe <strong className="font-bold">identificou informações sensíveis ou contraditórias</strong> em relação a um ou mais indivíduos/entidades ligados a este cliente. É fortemente recomendada uma <strong className="font-bold">análise aprofundada manual</strong> pelos gestores de compliance antes da aceitação ou manutenção do relacionamento com o cliente, para mitigar riscos reputacionais e legais para a firma.
                </p>
              ) : (
                <p className="text-sm text-emerald-900 leading-relaxed">
                  Com base nos resultados processados acima, a equipe <strong className="font-bold">não identificou nenhuma informação contraditória</strong> em relação ao conhecimento da equipe sobre os indivíduos e a Empresa nos buscadores públicos. Não foi identificada durante este processo preliminar nenhuma informação de domínio público que pudesse levar a risco ou questão reputacional que impeça a aceitação ou manutenção do relacionamento com o cliente.
                </p>
              )}
            </div>

            <div className="mt-12 text-center text-slate-400 text-xs border-t border-slate-100 pt-6 print:block">
              <p>Relatório gerado automaticamente por IA integrada a motores de busca públicos.</p>
              <p>Data e Hora: {new Date().toLocaleString('pt-BR')}</p>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}