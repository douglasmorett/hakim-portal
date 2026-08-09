async function callFixApi() {
  const url = "https://hakim-portal.vercel.app/api/admin/fix-boleto?secret=hakim-billing-secret-2026";
  const orderId = "cmsf0noc80004kw04w61b9vnz"; // #1B9VNZ

  console.log(`Calling production API: ${url}`);
  console.log(`Payload: orderId=${orderId}`);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId })
    });

    const status = res.status;
    const text = await res.text();
    console.log(`HTTP Status: ${status}`);
    console.log(`Response Text: ${text}`);

    let data;
    try { data = JSON.parse(text); } catch (e) {}

    if (res.ok && data?.success) {
      console.log(`\n🎉 SUCCESS!`);
      console.log(`   New Payment ID: ${data.newPaymentId}`);
      console.log(`   New Boleto URL: ${data.newBoletoUrl}`);
      console.log(`   Total Amount: R$ ${data.totalAmount}`);
    } else {
      console.error(`\n❌ API Error:`, data || text);
    }
  } catch (err) {
    console.error(`Fetch error:`, err.message);
  }
}

callFixApi().catch(console.error);
