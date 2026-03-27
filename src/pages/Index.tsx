import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, TrendingUp, Users, ArrowRight, CheckCircle2, Calculator } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";

const features = [
  { icon: Shield, title: "Segurança Bancária", desc: "Seus dados estão protegidos com criptografia de ponta a ponta e verificação rigorosa." },
  { icon: TrendingUp, title: "Crédito Inteligente", desc: "Análise processada em minutos para que você receba o capital quando mais precisa." },
  { icon: Users, title: "Rede de Confiança", desc: "Programa de indicações que beneficia tanto quem indica quanto quem começa." },
];

export default function Index() {
  const [amount, setAmount] = useState(150000);
  const [months, setMonths] = useState(1);

  const interestRate = months === 1 ? 0.35 : 0.45;
  const interest = amount * interestRate;
  const total = amount + interest;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-primary">
              +Kwanz<span className="text-accent">as</span>
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#funcionalidades" className="hover:text-primary transition-colors">Funcionalidades</a>
            <a href="#sobre" className="hover:text-primary transition-colors">Sobre</a>
            <Link to="/login" className="hover:text-primary transition-colors">Entrar</Link>
          </div>
          <Button size="lg" className="rounded-full shadow-primary hover:shadow-lg transition-all" asChild>
            <Link to="/cadastro">Criar Conta</Link>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-primary text-xs font-bold mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              SISTEMA TECNOLÓGICO DISPONÍVEL EM ANGOLA
            </div>
            <h2 className="text-5xl lg:text-7xl font-bold leading-tight mb-6">
              O seu parceiro de <br />
              <span className="text-primary italic">progresso financeiro</span>
            </h2>
            <p className="text-xl text-slate-600 mb-10 max-w-lg">
              Sistemas tecnológico de intermediação de serviços comerciais para impulsionar o seu negócio.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="xl" className="rounded-full h-14 px-8" asChild>
                <Link to="/cadastro">Começar Agora <ArrowRight className="ml-2 w-5 h-5" /></Link>
              </Button>
              <Button size="xl" variant="outline" className="rounded-full h-14 px-8 border-slate-200" asChild>
                <Link to="/login">Aceder à conta</Link>
              </Button>
            </div>
            <p className="mt-6 text-sm font-bold text-accent px-4 py-2 bg-orange-50 rounded-lg inline-block border border-orange-100">
              Apenas para clientes com indicação. Para mais Informações ligar: 910 000 100
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-primary/5 rounded-[2rem] blur-2xl" />
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-elevated bg-slate-200">
              <img
                src="/images/hero.png"
                alt="Profissionais no escritório"
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Simulator Section */}
      <section className="py-20 bg-white relative">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="w-full max-w-xl bg-white rounded-[2.5rem] p-8 md:p-12 shadow-elevated border border-slate-50 relative z-10"
          >
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center">
                <Calculator className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Simulador de Crédito</h3>
                <p className="text-slate-500">Calcule o seu empréstimo ideal</p>
              </div>
            </div>

            <div className="space-y-12">
              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <span className="text-slate-700 font-bold text-lg">Valor do empréstimo</span>
                  <span className="text-4xl font-black text-accent font-display">
                    {amount.toLocaleString()} <span className="text-lg">Kz</span>
                  </span>
                </div>
                <Slider
                  defaultValue={[amount]}
                  max={500000}
                  min={10000}
                  step={5000}
                  onValueChange={(val) => setAmount(val[0])}
                  className="py-4"
                />
                <div className="flex justify-between text-xs font-bold text-slate-400 tracking-wider">
                  <span>10.000 Kz</span>
                  <span>500.000 Kz</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setMonths(1)}
                  className={`py-6 rounded-2xl font-bold transition-all text-lg flex flex-col items-center gap-1 ${months === 1
                    ? "gradient-accent text-white shadow-accent active:scale-95"
                    : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                    }`}
                >
                  1 Mês <span>(35%)</span>
                </button>
                <button
                  onClick={() => setMonths(2)}
                  className={`py-6 rounded-2xl font-bold transition-all text-lg flex flex-col items-center gap-1 ${months === 2
                    ? "gradient-accent text-white shadow-accent active:scale-95"
                    : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                    }`}
                >
                  2 Meses <span>(45%)</span>
                </button>
              </div>

              <div className="bg-slate-50/50 rounded-3xl p-8 space-y-4 border border-slate-100">
                <div className="flex justify-between items-center text-slate-600">
                  <span className="font-medium">Juros</span>
                  <span className="font-bold text-slate-900">{interest.toLocaleString()} Kz</span>
                </div>
                <div className="h-px bg-slate-200" />
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-slate-900">Total a pagar</span>
                  <span className="text-2xl font-black text-accent font-display">
                    {total.toLocaleString()} Kz
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <Button size="xl" className="w-full h-20 rounded-2xl gradient-accent shadow-accent text-xl font-bold group" asChild>
                  <Link to="/cadastro">
                    Criar conta e solicitar
                    <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <p className="text-center text-xs font-bold text-slate-400">
                  ⚠️ Cadastro restrito a convidados. Suporte: 910 000 100
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Sobre Section */}
      <section id="sobre" className="py-24 bg-slate-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/[0.02] transform -skew-x-12 translate-x-1/2" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div>
                <h3 className="text-sm font-bold text-accent uppercase tracking-widest mb-4">Sobre Nós</h3>
                <h4 className="text-4xl lg:text-5xl font-bold text-slate-900 leading-tight">
                  Inovação tecnológica<br />

                </h4>
              </div>

              <p className="text-lg text-slate-600 leading-relaxed max-w-xl">
                O +Kwanzas nasce da necessidade de modernizar o acesso a serviços financeiros e comerciais em Angola. Não somos apenas um sistema; somos o motor tecnológico que facilita a intermediação e o progresso de milhares de profissionais.
              </p>

              <div className="grid sm:grid-cols-2 gap-6">
                {[
                  { title: "Nossa Missão", desc: "Digitalizar e simplificar processos comerciais com total transparência." },
                  { title: "Nossa Visão", desc: "Ser o padrão de confiança para operações de crédito e serviços em Angola." }
                ].map((item) => (
                  <div key={item.title} className="p-6 rounded-2xl bg-white shadow-soft border border-slate-100">
                    <h5 className="font-bold text-primary mb-2">{item.title}</h5>
                    <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <Button size="lg" className="rounded-full px-8 h-14 font-bold" asChild>
                  <Link to="/cadastro">Fazer parte da rede</Link>
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              className="relative"
            >
              <div className="absolute -inset-6 bg-accent/5 rounded-[3rem] blur-3xl" />
              <div className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white">
                <img
                  src="/images/about.png"
                  alt="Liderança +Kwanzas"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-6 left-6 right-6 p-6 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl">
                  <p className="text-slate-900 font-bold italic">
                    "Acreditamos que a tecnologia é a chave para a liberdade financeira em Luanda e em todo o país."
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      <section id="funcionalidades" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h3 className="text-sm font-bold text-accent uppercase tracking-widest mb-4">Diferenciais</h3>
            <h4 className="text-4xl font-bold text-slate-900">Porquê escolher o +Kwanzas?</h4>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.2 }}
                className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-primary/20 hover:bg-white hover:shadow-xl transition-all group"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors">
                  <f.icon className="w-7 h-7" />
                </div>
                <h5 className="text-xl font-bold mb-4">{f.title}</h5>
                <p className="text-slate-600 leading-relaxed">
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-primary rounded-[2.5rem] p-12 lg:p-20 relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 opacity-10 grayscale pointer-events-none">
              <img src="/images/financial_bg.png" alt="" className="w-full h-full object-cover" />
            </div>
            <div className="relative z-10 max-w-3xl">
              <h4 className="text-4xl lg:text-5xl font-bold text-white mb-6">
                Pronto para transformar a sua realidade financeira?
              </h4>
              <p className="text-white/80 text-lg mb-10 max-w-xl">
                Junte-se a milhares de angolanos que já utilizam a nossa tecnologia para gerir os seus recursos com eficiência e segurança.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="xl" className="bg-accent hover:bg-accent/90 text-white rounded-full h-14 px-10 shadow-lg">
                  Criar Conta Gratuita
                </Button>
                <div className="flex items-center gap-2 text-white/90 text-sm font-medium">
                  <CheckCircle2 className="w-5 h-5 text-accent" />
                  Cadastro apenas por indicação
                </div>
              </div>
              <p className="mt-8 text-white/60 text-sm italic">
                Qualquer dúvida entre em contacto com o suporte: 910 000 100
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 border-t py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-slate-400 text-sm">
            © 2024 +Kwanzas. Todos os direitos reservados.
          </div>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <Link to="/admin/login" className="text-slate-400 hover:text-primary transition-colors text-sm">Painel Administrativo</Link>
            <div className="flex items-center gap-3 py-2 px-4 rounded-2xl bg-white shadow-soft border border-slate-100 transition-transform hover:scale-105">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Desenvolvido por</span>
              <img src="/images/bytekwanza_logo_hq.png" alt="byteKwanza" className="h-10 w-auto" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
