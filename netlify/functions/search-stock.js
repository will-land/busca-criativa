/**
 * search-stock: Busca imagens em Unsplash, Pexels e Pixabay
 * Suporta paginacao via parametro ?page=N
 */

exports.handler = async (event) => {
    const query = event.queryStringParameters.q || '';
    const page = parseInt(event.queryStringParameters.page || '1', 10);
    const perPage = 15; // por provedor

    if (query.trim().length < 2) {
        return { statusCode: 400, body: JSON.stringify({ error: "Query muito curta." }) };
    }

    const { UNSPLASH_ACCESS_KEY, PEXELS_API_KEY, PIXABAY_API_KEY } = process.env;

    const hasUnsplash = UNSPLASH_ACCESS_KEY && UNSPLASH_ACCESS_KEY.trim().length > 5;
    const hasPexels = PEXELS_API_KEY && PEXELS_API_KEY.trim().length > 5;
    const hasPixabay = PIXABAY_API_KEY && PIXABAY_API_KEY.trim().length > 5;

    if (!hasUnsplash && !hasPexels && !hasPixabay) {
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                items: [],
                error: "missing_keys",
                message: "Nenhuma chave de API configurada. Abra o arquivo .env.local e adicione pelo menos uma chave."
            })
        };
    }

    const results = [];

    try {
        const fetchPromises = [];

        // 1) Unsplash
        if (hasUnsplash) {
            fetchPromises.push(
                fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}`, {
                    headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` }
                })
                    .then(res => res.json())
                    .then(data => {
                        if (data.results && Array.isArray(data.results)) {
                            data.results.forEach(img => {
                                results.push({
                                    id: `us_${img.id}`,
                                    provider: 'Unsplash',
                                    thumbUrl: img.urls.small,
                                    fullUrl: img.urls.full,
                                    pageUrl: img.links.html,
                                    authorName: img.user?.name || 'Unsplash User'
                                });
                            });
                        }
                    }).catch(err => console.error("Unsplash error:", err.message))
            );
        }

        // 2) Pexels
        if (hasPexels) {
            fetchPromises.push(
                fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}`, {
                    headers: { Authorization: PEXELS_API_KEY }
                })
                    .then(res => res.json())
                    .then(data => {
                        if (data.photos && Array.isArray(data.photos)) {
                            data.photos.forEach(img => {
                                results.push({
                                    id: `px_${img.id}`,
                                    provider: 'Pexels',
                                    thumbUrl: img.src.medium,
                                    fullUrl: img.src.original,
                                    pageUrl: img.url,
                                    authorName: img.photographer
                                });
                            });
                        }
                    }).catch(err => console.error("Pexels error:", err.message))
            );
        }

        // 3) Pixabay
        if (hasPixabay) {
            fetchPromises.push(
                fetch(`https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(query)}&image_type=photo&per_page=${perPage}&page=${page}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.hits && Array.isArray(data.hits)) {
                            data.hits.forEach(img => {
                                results.push({
                                    id: `pb_${img.id}`,
                                    provider: 'Pixabay',
                                    thumbUrl: img.webformatURL,
                                    fullUrl: img.largeImageURL,
                                    pageUrl: img.pageURL,
                                    authorName: img.user
                                });
                            });
                        }
                    }).catch(err => console.error("Pixabay error:", err.message))
            );
        }

        await Promise.allSettled(fetchPromises);

        // Misturar resultados para nao ficar agrupado por provedor
        const shuffled = results.sort(() => 0.5 - Math.random());

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                items: shuffled,
                page: page,
                hasMore: results.length >= 5 // se retornou pelo menos 5, provavelmente tem mais
            })
        };

    } catch (error) {
        console.error("Erro geral search-stock:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Falha ao buscar imagens." }) };
    }
};
