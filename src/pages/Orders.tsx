import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Package, Users, Plus, LogOut, Filter, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  subtotal: number;
  product_id: string;
  products: {
    name: string;
  };
}

interface Order {
  id: string;
  order_date: string;
  delivered: boolean;
  total_amount: number;
  clients: {
    name: string;
  };
  order_items: OrderItem[];
}

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const { signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, selectedDate]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          clients (name),
          order_items (
            id,
            quantity,
            price,
            subtotal,
            product_id,
            products (name)
          )
        `)
        .order('order_date', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      toast({
        title: 'Error loading orders',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    const filtered = orders.filter(order => {
      const orderDate = format(new Date(order.order_date), 'yyyy-MM-dd');
      return orderDate === selectedDate;
    });
    setFilteredOrders(filtered);
  };

  const toggleDelivered = async (orderId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ delivered: !currentStatus })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: 'Status updated',
        description: `Order marked as ${!currentStatus ? 'delivered' : 'not delivered'}.`,
      });

      fetchOrders();
    } catch (error: any) {
      toast({
        title: 'Error updating status',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">OrderSync</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-4 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
            <span className="text-sm text-muted-foreground">
              {filteredOrders.length} order(s)
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate('/products')}>
              <Package className="mr-2 h-4 w-4" />
              Products
            </Button>
            <Button onClick={() => navigate('/clients')}>
              <Users className="mr-2 h-4 w-4" />
              Clients
            </Button>
            <Button onClick={() => navigate('/orders/new')} className="bg-primary">
              <Plus className="mr-2 h-4 w-4" />
              New Order
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{order.clients.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(order.order_date), "HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <Badge
                    variant={order.delivered ? "default" : "secondary"}
                    className={order.delivered ? "bg-success" : ""}
                    onClick={() => toggleDelivered(order.id, order.delivered)}
                    style={{ cursor: 'pointer' }}
                  >
                    {order.delivered ? 'Delivered' : 'Pending'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {order.order_items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {item.quantity}x {item.products.name}
                      </span>
                      <span className="font-medium">
                        R$ {item.subtotal.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-primary">R$ {order.total_amount.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No orders found</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Create your first order to get started
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Orders;
