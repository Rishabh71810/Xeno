"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Calendar, X, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [total, setTotal] = useState(0);
  const [filteredRevenue, setFilteredRevenue] = useState(0);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/orders?search=${search}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;
      
      const { data } = await api.get(url);
      const ordersData = data.data?.orders || data.data || [];
      setOrders(ordersData);
      setTotal(data.data?.total || ordersData.length);
      
      // Calculate filtered revenue
      const revenue = ordersData.reduce((sum: number, order: any) => {
        return sum + (parseFloat(order.totalPrice) || 0);
      }, 0);
      setFilteredRevenue(revenue);
    } catch (error) {
      console.error("Failed to fetch orders", error);
    } finally {
      setLoading(false);
    }
  }, [search, startDate, endDate]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchOrders();
    }, 300);
    return () => clearTimeout(debounce);
  }, [fetchOrders]);

  const clearFilters = () => {
    setSearch("");
    setStartDate("");
    setEndDate("");
  };

  const hasFilters = search || startDate || endDate;

  // Quick date presets
  const setDatePreset = (preset: string) => {
    const today = new Date();
    const end = today.toISOString().split('T')[0];
    let start = "";

    switch (preset) {
      case "today":
        start = end;
        break;
      case "week":
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        start = weekAgo.toISOString().split('T')[0];
        break;
      case "month":
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        start = monthAgo.toISOString().split('T')[0];
        break;
      case "quarter":
        const quarterAgo = new Date(today);
        quarterAgo.setMonth(quarterAgo.getMonth() - 3);
        start = quarterAgo.toISOString().split('T')[0];
        break;
      case "year":
        const yearAgo = new Date(today);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        start = yearAgo.toISOString().split('T')[0];
        break;
    }

    setStartDate(start);
    setEndDate(end);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground">
            {total} orders {hasFilters && `• ₹${filteredRevenue.toLocaleString()} revenue`}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>Filter orders by search query or date range</CardDescription>
          
          {/* Search and Date Filters */}
          <div className="grid gap-4 pt-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order number, customer email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Date Range */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1.5 block">Start Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-1.5 block">End Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            {/* Quick Date Presets */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground mr-2 self-center">Quick:</span>
              <Button variant="outline" size="sm" onClick={() => setDatePreset("today")}>Today</Button>
              <Button variant="outline" size="sm" onClick={() => setDatePreset("week")}>Last 7 days</Button>
              <Button variant="outline" size="sm" onClick={() => setDatePreset("month")}>Last 30 days</Button>
              <Button variant="outline" size="sm" onClick={() => setDatePreset("quarter")}>Last 3 months</Button>
              <Button variant="outline" size="sm" onClick={() => setDatePreset("year")}>Last year</Button>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-500 hover:text-red-600">
                  <X className="h-4 w-4 mr-1" />
                  Clear all
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fulfillment</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Loading orders...
                    </div>
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="text-muted-foreground">
                      {hasFilters ? "No orders match your filters" : "No orders found"}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.name || `#${order.orderNumber}`}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {order.customer?.firstName} {order.customer?.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">{order.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {order.shopifyCreatedAt 
                        ? new Date(order.shopifyCreatedAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={order.financialStatus === 'paid' ? 'default' : 'secondary'}
                        className={order.financialStatus === 'paid' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}
                      >
                        {order.financialStatus || 'pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline"
                        className={order.fulfillmentStatus === 'fulfilled' ? 'border-green-500 text-green-600' : 'border-yellow-500 text-yellow-600'}
                      >
                        {order.fulfillmentStatus || 'unfulfilled'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{parseFloat(order.totalPrice || 0).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
