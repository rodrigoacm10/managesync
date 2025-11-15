import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  price: number;
}

interface Client {
  id: string;
  name: string;
}

interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

const NewOrder = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([{ productId: '', quantity: 1, price: 0 }]);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 16));
  const [delivered, setDelivered] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchClientsAndProducts();
  }, []);

  const fetchClientsAndProducts = async () => {
    try {
      const [clientsRes, productsRes] = await Promise.all([
        supabase.from('clients').select('*').order('name'),
        supabase.from('products').select('*').order('name'),
      ]);

      if (clientsRes.error) throw clientsRes.error;
      if (productsRes.error) throw productsRes.error;

      setClients(clientsRes.data || []);
      setProducts(productsRes.data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar dados',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const addOrderItem = () => {
    setOrderItems([...orderItems, { productId: '', quantity: 1, price: 0 }]);
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const updateOrderItem = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...orderItems];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index].price = product.price;
      }
    }

    setOrderItems(newItems);
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => {
      if (item.productId && item.quantity > 0) {
        return sum + (item.price * item.quantity);
      }
      return sum;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedClient) return;

    const validItems = orderItems.filter(item => item.productId && item.quantity > 0);
    if (validItems.length === 0) {
      toast({
        title: 'Erro',
        description: 'Adicione pelo menos um produto ao pedido',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const totalAmount = calculateTotal();

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          client_id: selectedClient,
          order_date: new Date(orderDate).toISOString(),
          delivered,
          total_amount: totalAmount,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const itemsToInsert = validItems.map(item => ({
        order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast({
        title: 'Pedido criado!',
        description: 'O pedido foi registrado com sucesso.',
      });

      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Erro ao criar pedido',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex h-16 items-center px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="ml-4 text-2xl font-bold">Novo Pedido</h1>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl p-4">
        <Card>
          <CardHeader>
            <CardTitle>Informações do Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="client">Cliente</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Data e Hora</Label>
                <Input
                  id="date"
                  type="datetime-local"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Produtos</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addOrderItem}>
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Produto
                  </Button>
                </div>

                {orderItems.map((item, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                          <Label>Produto</Label>
                          <Select
                            value={item.productId}
                            onValueChange={(value) => updateOrderItem(index, 'productId', value)}
                            required
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name} - R$ {product.price.toFixed(2)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="w-24 space-y-2">
                          <Label>Qtd</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateOrderItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            required
                          />
                        </div>

                        <div className="flex items-end">
                          {orderItems.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeOrderItem(index)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {item.productId && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          Subtotal: R$ {(item.price * item.quantity).toFixed(2)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="delivered"
                  checked={delivered}
                  onCheckedChange={(checked) => setDelivered(checked as boolean)}
                />
                <Label htmlFor="delivered" className="cursor-pointer">
                  Marcar como entregue
                </Label>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total do Pedido</span>
                  <span className="text-primary">R$ {calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Criando...' : 'Criar Pedido'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default NewOrder;
