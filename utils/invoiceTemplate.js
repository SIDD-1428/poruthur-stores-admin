export const generateInvoiceHtml = (order: any) => {
  const formatDate = (timestamp: any) => {
    if (!timestamp?.seconds) return "";

    return new Date(timestamp.seconds * 1000).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const items = order.items
    .map(
      (item: any) => `
      <tr>
          <td>${item.name}</td>
          <td style="text-align:center">${item.quantity}</td>
          <td style="text-align:right">₹${item.unitPrice ?? item.price}</td>
          <td style="text-align:right">
            ₹${item.totalPrice ?? (item.price * item.quantity)}
          </td>
      </tr>
    `
    )
    .join("");

  return `
<!DOCTYPE html>
<html>

<head>

<meta charset="UTF-8">

<style>

body{
    font-family:Arial,Helvetica,sans-serif;
    padding:30px;
    color:#222;
}

.header{
    display:flex;
    justify-content:space-between;
    align-items:center;
    border-bottom:2px solid #1B5E20;
    padding-bottom:15px;
}

.store{
    font-size:28px;
    font-weight:bold;
    color:#1B5E20;
}

.tagline{
    color:#777;
    font-size:13px;
}

.badge{
    background:#1B5E20;
    color:white;
    padding:8px 16px;
    border-radius:6px;
    font-weight:bold;
}

.section{
    margin-top:24px;
}

.section h3{
    color:#1B5E20;
    border-bottom:1px solid #DDD;
    padding-bottom:6px;
}

.info{
    width:100%;
}

.info td{
    padding:5px 0;
}

table{
    width:100%;
    border-collapse:collapse;
    margin-top:10px;
}

th{
    background:#1B5E20;
    color:white;
    padding:10px;
    text-align:left;
}

td{
    padding:10px;
    border-bottom:1px solid #EEE;
}

tr:nth-child(even){
    background:#FAFAFA;
}

.summary{
    margin-top:20px;
    width:320px;
    margin-left:auto;
}

.summary td{
    padding:8px;
}

.total{
    font-size:22px;
    font-weight:bold;
    color:#1B5E20;
    border-top:2px solid #1B5E20;
}

.footer{
    margin-top:45px;
    text-align:center;
    color:#777;
    font-size:12px;
}

</style>

</head>

<body>

<div class="header">

<div>

<div class="store">
BonMart
</div>

<div class="tagline">
Shop Good, Live Good
</div>

</div>

<div class="badge">
INVOICE
</div>

</div>

<div class="section">

<table class="info">

<tr>
<td><b>Invoice No</b></td>
<td>${order.invoice?.number ?? `PSINV-${order.id.slice(0,8).toUpperCase()}`}</td>
</tr>

<tr>
<td><b>Order ID</b></td>
<td>${order.id.slice(0,12).toUpperCase()}</td>
</tr>

<tr>
<td><b>Date</b></td>
<td>${formatDate(order.invoice?.issuedAt ?? order.createdAt)}</td>
</tr>

<tr>
<td><b>Status</b></td>
<td>${order.status}</td>
</tr>

</table>

</div>

<div class="section">

<h3>Customer</h3>

<p>

<b>${order.customerName}</b><br>

${order.customerEmail}<br>

${order.address?.phone}

</p>

</div>

<div class="section">

<h3>Delivery Address</h3>

<p>

${order.address?.type}<br>

${order.address?.address}<br>

${order.address?.landmark ?? ""}<br>

${order.address?.pincode}

</p>

</div>

<div class="section">

<h3>Items</h3>

<table>

<tr>

<th>Item</th>

<th>Qty</th>

<th>Unit</th>

<th>Amount</th>

</tr>

${items}

</table>

</div>

<table class="summary">

<tr>

<td>Subtotal</td>

<td align="right">
₹${order.pricing?.subtotal ?? order.total}
</td>

</tr>

<tr>

<td>Delivery</td>

<td align="right">

${
  order.pricing?.deliveryCharge === 0
    ? "FREE"
    : `₹${order.pricing?.deliveryCharge}`
}

</td>

</tr>

<tr>

<td>GST</td>

<td align="right">

₹${order.pricing?.tax ?? 0}

</td>

</tr>

<tr class="total">

<td>Grand Total</td>

<td align="right">

₹${order.pricing?.grandTotal ?? order.total}

</td>

</tr>

</table>

<div class="section">

<h3>Payment</h3>

<p>

Method :
${order.payment?.method ?? "Cash on Delivery"}

<br><br>

Status :
${order.payment?.status ?? "Pending"}

</p>

</div>

<div class="footer">

<b>Thank you for shopping with BonMart</b>

<br><br>

This is a computer generated invoice.

</div>

</body>

</html>
`;
};