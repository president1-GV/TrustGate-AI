module.exports = async function(request) {
  return new Response("OK SPECIMEN", {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Access-Control-Allow-Origin": "*"
    }
  });
};
