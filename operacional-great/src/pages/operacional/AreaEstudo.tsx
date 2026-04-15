import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BookOpen, Bot, ExternalLink, File, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";

interface StudyCategory {
  id: string;
  name: string;
  color: string | null;
}

interface StudyResource {
  id: string;
  category_id: string;
  title: string;
  description: string | null;
  source_url: string | null;
  file_ref: string | null;
}

export default function AreaEstudo() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const canManage = isAdmin || (user as any)?.operational_role === "COORDENADOR_RED";

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<StudyResource | null>(null);
  const [form, setForm] = useState({ category_id: "", title: "", description: "", source_url: "" });

  const { data: categories = [] } = useQuery({
    queryKey: ["study-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("study_categories").select("id, name, color").order("name");
      if (error) throw error;
      return data as StudyCategory[];
    },
  });

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ["study-resources", selectedCategory],
    queryFn: async () => {
      let query = supabase.from("study_resources").select("id, category_id, title, description, source_url, file_ref");
      if (selectedCategory !== "all") query = query.eq("category_id", selectedCategory);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data as StudyResource[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        category_id: form.category_id,
        title: form.title,
        description: form.description || null,
        source_url: form.source_url || null,
        file_ref: editingResource?.file_ref || null,
        type: "LINK" as any,
        tags: [],
        difficulty: "INICIANTE" as any,
        visibility: "ALL_INTERNAL" as any,
        created_by_user_id: user?.id,
      };

      if (editingResource) {
        const { error } = await supabase.from("study_resources").update(payload).eq("id", editingResource.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("study_resources").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study-resources"] });
      toast.success(editingResource ? "ConteÃºdo atualizado!" : "ConteÃºdo adicionado!");
      setIsAddOpen(false);
      setEditingResource(null);
      setForm({ category_id: "", title: "", description: "", source_url: "" });
    },
    onError: () => toast.error("Erro ao salvar conteÃºdo"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("study_resources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study-resources"] });
      toast.success("ConteÃºdo removido!");
    },
  });

  const filteredResources = resources.filter((resource) =>
    resource.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const openEdit = (resource: StudyResource) => {
    setEditingResource(resource);
    setForm({
      category_id: resource.category_id,
      title: resource.title,
      description: resource.description || "",
      source_url: resource.source_url || "",
    });
    setIsAddOpen(true);
  };

  return (
    <div className="grid min-h-[calc(100vh-8.5rem)] grid-cols-1 overflow-hidden rounded-[32px] border border-primary/10 bg-card shadow-[0_20px_50px_rgba(225,6,0,0.08)] lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="border-b border-primary/10 bg-[linear-gradient(180deg,rgba(255,248,248,1),rgba(255,255,255,1))] lg:border-b-0 lg:border-r">
        <div className="border-b border-primary/10 p-5">
          <h2 className="flex items-center gap-2 font-semibold text-foreground">
            <BookOpen className="h-5 w-5 text-primary" />
            Ãreas de estudo
          </h2>
        </div>
        <ScrollArea className="h-[220px] lg:h-[calc(100vh-17rem)]">
          <div className="space-y-1 p-2">
            <button
              onClick={() => setSelectedCategory("all")}
                className={cn("w-full rounded-xl px-3 py-2 text-left text-sm transition-colors", selectedCategory === "all" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-primary/5 hover:text-foreground")}
            >
              Todos os conteÃºdos
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn("w-full rounded-xl px-3 py-2 text-left text-sm transition-colors", selectedCategory === category.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-primary/5 hover:text-foreground")}
              >
                {category.name}
              </button>
            ))}
          </div>
        </ScrollArea>
      </aside>

      <section className="min-w-0 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(255,250,250,0.96))]">
        <div className="border-b border-primary/10 px-5 py-5 md:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Ãrea de Estudos</h1>
              <p className="text-sm text-muted-foreground">ConteÃºdos do setor operacional.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-2xl border border-primary/10 bg-card p-1 shadow-sm">
                <span className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">ConteÃºdos</span>
                <Link to="/operacional/great-study-ai" className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-primary/5 hover:text-foreground">
                  <Bot className="h-4 w-4 text-primary" />
                  Great Study AI
                </Link>
              </div>
              {canManage && (
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingResource(null);
                      setForm({ category_id: "", title: "", description: "", source_url: "" });
                    }}>
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar conteÃºdo
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>{editingResource ? "Editar conteÃºdo" : "Adicionar conteÃºdo"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div>
                        <Label>Ãrea</Label>
                        <Select value={form.category_id} onValueChange={(value) => setForm((prev) => ({ ...prev, category_id: value }))}>
                          <SelectTrigger><SelectValue placeholder="Selecione uma Ã¡rea" /></SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>TÃ­tulo</Label>
                        <Input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
                      </div>
                      <div>
                        <Label>DescriÃ§Ã£o</Label>
                        <Textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
                      </div>
                      <div>
                        <Label>Link</Label>
                        <Input value={form.source_url} onChange={(event) => setForm((prev) => ({ ...prev, source_url: event.target.value }))} placeholder="https://..." />
                      </div>
                      <Button onClick={() => saveMutation.mutate()} disabled={!form.category_id || !form.title || saveMutation.isPending} className="w-full">
                        {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
          <div className="relative mt-4 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar por tÃ­tulo..." className="pl-9" />
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-17.5rem)]">
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-3 md:p-6">
            {isLoading ? (
              <div className="col-span-full flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredResources.length === 0 ? (
              <div className="col-span-full rounded-[24px] border border-dashed border-primary/15 bg-card p-10 text-center">
                <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="mb-2 text-lg font-medium text-foreground">Nenhum conteÃºdo encontrado</h3>
                <p className="text-sm text-muted-foreground">Use a busca ou cadastre um novo material.</p>
              </div>
            ) : (
              filteredResources.map((resource) => {
                const category = categories.find((item) => item.id === resource.category_id);
                return (
                  <Card key={resource.id} className="border-primary/10 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(255,247,247,0.96))] transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_16px_30px_rgba(225,6,0,0.08)]">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-3">
                        <span className="rounded-full px-2 py-1 text-xs" style={{ backgroundColor: category?.color ? `${category.color}20` : "hsl(var(--primary) / 0.1)", color: category?.color || "hsl(var(--primary))" }}>
                          {category?.name || "Sem categoria"}
                        </span>
                        {canManage && (
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(resource)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => deleteMutation.mutate(resource.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <CardTitle className="text-base">{resource.title}</CardTitle>
                      {resource.description && <CardDescription>{resource.description}</CardDescription>}
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                      {resource.source_url && (
                        <Button size="sm" className="flex-1 min-w-[140px]" onClick={() => window.open(resource.source_url!, "_blank")}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Acessar link
                        </Button>
                      )}
                      {resource.file_ref && (
                        <Button size="sm" variant="outline" className="flex-1 min-w-[140px]" onClick={() => window.open(supabase.storage.from("study-files").getPublicUrl(resource.file_ref!).data.publicUrl, "_blank")}>
                          <File className="mr-2 h-4 w-4" />
                          Baixar arquivo
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </ScrollArea>
      </section>
    </div>
  );
}
