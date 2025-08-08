import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

interface RequestTypeRow {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface ServiceTypeRow {
  id: string;
  name: string;
  description: string | null;
  daily_allowance: number;
  is_active: boolean;
}

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [checkingRole, setCheckingRole] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [requestTypes, setRequestTypes] = useState<RequestTypeRow[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRow[]>([]);

  const [rtName, setRtName] = useState('');
  const [rtDesc, setRtDesc] = useState('');

  const [stName, setStName] = useState('');
  const [stDesc, setStDesc] = useState('');
  const [stDaily, setStDaily] = useState<number>(0);

  useEffect(() => {
    document.title = 'Administración | Viáticos';
  }, []);

  useEffect(() => {
    const check = async () => {
      try {
        if (!user) return;
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });
        if (error) throw error;
        setIsAdmin(!!data);
        if (!!data) {
          await Promise.all([fetchRequestTypes(), fetchServiceTypes()]);
        }
      } catch (e) {
        console.error('Error checking role', e);
        setIsAdmin(false);
      } finally {
        setCheckingRole(false);
      }
    };
    check();
  }, [user]);

  const fetchRequestTypes = async () => {
    const { data, error } = await supabase.from('request_types').select('*').order('name');
    if (error) {
      toast({ title: 'Error', description: 'No se pudieron cargar los tipos de solicitud', variant: 'destructive' });
      return;
    }
    setRequestTypes(data || []);
  };

  const fetchServiceTypes = async () => {
    const { data, error } = await supabase.from('service_types').select('*').order('name');
    if (error) {
      toast({ title: 'Error', description: 'No se pudieron cargar los tipos de servicio', variant: 'destructive' });
      return;
    }
    setServiceTypes(data || []);
  };

  const addRequestType = async () => {
    if (!rtName.trim()) return;
    const { error } = await supabase.from('request_types').insert({ name: rtName.trim(), description: rtDesc || null, is_active: true });
    if (error) {
      toast({ title: 'Error', description: 'No se pudo crear el tipo de solicitud', variant: 'destructive' });
      return;
    }
    setRtName('');
    setRtDesc('');
    toast({ title: 'Creado', description: 'Tipo de solicitud creado' });
    fetchRequestTypes();
  };

  const toggleRequestType = async (id: string, value: boolean) => {
    const { error } = await supabase.from('request_types').update({ is_active: value }).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar', variant: 'destructive' });
      return;
    }
    fetchRequestTypes();
  };

  const addServiceType = async () => {
    if (!stName.trim()) return;
    const { error } = await supabase.from('service_types').insert({ name: stName.trim(), description: stDesc || null, daily_allowance: stDaily || 0, is_active: true });
    if (error) {
      toast({ title: 'Error', description: 'No se pudo crear el tipo de servicio', variant: 'destructive' });
      return;
    }
    setStName('');
    setStDesc('');
    setStDaily(0);
    toast({ title: 'Creado', description: 'Tipo de servicio creado' });
    fetchServiceTypes();
  };

  const toggleServiceType = async (id: string, value: boolean) => {
    const { error } = await supabase.from('service_types').update({ is_active: value }).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar', variant: 'destructive' });
      return;
    }
    fetchServiceTypes();
  };

  if (checkingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">Verificando permisos…</div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-semibold">No autorizado</h1>
        <p className="text-muted-foreground">Debes ser administrador para acceder.</p>
        <Button onClick={() => navigate('/')}>Volver al inicio</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Panel de administración
            </h1>
            <p className="text-muted-foreground">Gestiona catálogos de tipos</p>
          </div>

          <Tabs defaultValue="request-types" className="w-full">
            <TabsList>
              <TabsTrigger value="request-types">Tipos de solicitud</TabsTrigger>
              <TabsTrigger value="service-types">Tipos de servicio</TabsTrigger>
            </TabsList>

            <TabsContent value="request-types">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Crear nuevo tipo de solicitud</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Nombre</Label>
                      <Input value={rtName} onChange={(e) => setRtName(e.target.value)} placeholder="Ej. Nacional" />
                    </div>
                    <div>
                      <Label>Descripción (opcional)</Label>
                      <Input value={rtDesc} onChange={(e) => setRtDesc(e.target.value)} placeholder="Detalles" />
                    </div>
                  </div>
                  <Button onClick={addRequestType}>Crear</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Listado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {requestTypes.map((rt) => (
                      <div key={rt.id} className="flex items-center justify-between p-3 rounded-md border">
                        <div>
                          <div className="font-medium">{rt.name}</div>
                          {rt.description && <div className="text-sm text-muted-foreground">{rt.description}</div>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`rt-${rt.id}`}>Activo</Label>
                          <Switch id={`rt-${rt.id}`} checked={rt.is_active} onCheckedChange={(v) => toggleRequestType(rt.id, v)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="service-types">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Crear nuevo tipo de servicio</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                      <Label>Nombre</Label>
                      <Input value={stName} onChange={(e) => setStName(e.target.value)} placeholder="Ej. Comisión" />
                    </div>
                    <div className="md:col-span-1">
                      <Label>Descripción (opcional)</Label>
                      <Input value={stDesc} onChange={(e) => setStDesc(e.target.value)} placeholder="Detalles" />
                    </div>
                    <div className="md:col-span-1">
                      <Label>Viático diario</Label>
                      <Input type="number" value={stDaily} onChange={(e) => setStDaily(Number(e.target.value))} />
                    </div>
                  </div>
                  <Button onClick={addServiceType}>Crear</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Listado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {serviceTypes.map((st) => (
                      <div key={st.id} className="flex items-center justify-between p-3 rounded-md border">
                        <div>
                          <div className="font-medium">{st.name}</div>
                          <div className="text-sm text-muted-foreground flex gap-3">
                            {st.description && <span>{st.description}</span>}
                            <Separator orientation="vertical" className="h-4" />
                            <span>${'{'}st.daily_allowance.toLocaleString(){'}'} / día</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`st-${st.id}`}>Activo</Label>
                          <Switch id={`st-${st.id}`} checked={st.is_active} onCheckedChange={(v) => toggleServiceType(st.id, v)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Admin;
