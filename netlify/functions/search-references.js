/**
 * search-references: Busca referencias de design em multiplas plataformas
 * Extrai resultados individuais (imagens verticais, titles) das plataformas
 * Suporta paginacao (via parametro ?page=N)
 */

exports.handler = async (event) => {
    const query = event.queryStringParameters.q || '';
    const page = parseInt(event.queryStringParameters.page || '1', 10);

    if (query.trim().length < 2) {
        return { statusCode: 400, body: JSON.stringify({ error: "Query muito curta." }) };
    }

    const encodedQuery = encodeURIComponent(query);
    const results = [];
    const perPage = 8; // Quantos de cada site vamos tentar pegar

    // User agents rotativos para enganar bloqueios basicos
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
    ];
    const userAgent = userAgents[page % userAgents.length];

    // Helpers
    const fetchHTML = async (url) => {
        const res = await fetch(url, { headers: { 'User-Agent': userAgent, 'Accept': 'text/html,application/xhtml+xml,application/xml;' }, signal: AbortSignal.timeout(8000) });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return await res.text();
    };

    // ============================================================
    // 1) DESIGNBR
    // ============================================================
    async function scrapeDesignBR() {
        const fallbackUrl = `https://designbr.com.br/page/${page}/?s=${encodedQuery}`;
        try {
            const html = await fetchHTML(fallbackUrl);

            const articleRegex = /<article[^>]*>[\s\S]*?<\/article>/gi;
            const articles = html.match(articleRegex) || [];
            let count = 0;

            for (const article of articles) {
                if (count >= perPage) break;
                const link = article.match(/<a[^>]*href=["']([^"']+)["'][^>]*>/i);
                const img = article.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/i);
                const title = article.match(/<h[1-6][^>]*>(?:<a[^>]*>)?([^<]+)/i);

                if (link && img) {
                    results.push({
                        id: `ref_designbr_${page}_${count}`,
                        provider: 'DesignBR',
                        pageUrl: link[1],
                        ogTitle: title ? title[1].trim() : 'Post DesignBR',
                        ogImage: img[1]
                    });
                    count++;
                }
            }
            if (count === 0 && page === 1) {
                results.push({ id: 'ref_designbr_search', provider: 'DesignBR', pageUrl: fallbackUrl, ogTitle: `Ver resultados no DesignBR`, ogImage: null });
            }
        } catch (e) {
            console.warn('DesignBR scrape falhou:', e.message);
            if (page === 1) results.push({ id: 'ref_designbr_fail', provider: 'DesignBR', pageUrl: fallbackUrl, ogTitle: `Ver resultados no DesignBR`, ogImage: null });
        }
    }

    // ============================================================
    // 2) DESIGNI (Ajustado Regex para thumbs reais)
    // ============================================================
    async function scrapeDesigni() {
        const fallbackUrl = `https://www.designi.com.br/busca/${encodedQuery}?page=${page}`;
        try {
            const html = await fetchHTML(fallbackUrl);

            const cardRegex = /<a[^>]+href=["'](https?:\/\/(?:www\.)?designi\.com\.br\/[^"']+\/\d+)["'][^>]*>[\s\S]*?<img[^>]*(?:data-src|src)=["']([^"']+)["'][^>]*alt=["']([^"']+)["']/gi;
            let match;
            let count = 0;

            while ((match = cardRegex.exec(html)) !== null && count < perPage) {
                // Designi as vezes usa data-src para lazy loading
                const imgUrl = match[2].startsWith('/') ? `https://www.designi.com.br${match[2]}` : match[2];
                if (!imgUrl.includes('avatar') && !imgUrl.includes('logo')) { // ignora avatares
                    results.push({
                        id: `ref_designi_${page}_${count}`,
                        provider: 'Designi',
                        pageUrl: match[1],
                        ogTitle: match[3],
                        ogImage: imgUrl
                    });
                    count++;
                }
            }
            if (count === 0 && page === 1) {
                results.push({ id: 'ref_designi_search', provider: 'Designi', pageUrl: fallbackUrl, ogTitle: `Ver resultados no Designi`, ogImage: null });
            }
        } catch (e) {
            console.warn('Designi scrape falhou:', e.message);
            if (page === 1) results.push({ id: 'ref_designi_fail', provider: 'Designi', pageUrl: fallbackUrl, ogTitle: `Ver resultados no Designi`, ogImage: null });
        }
    }

    // ============================================================
    // 3) DRIBBBLE
    // ============================================================
    async function scrapeDribbble() {
        const fallbackUrl = `https://dribbble.com/search/shots/popular?q=${encodedQuery}&page=${page}`;
        try {
            const html = await fetchHTML(fallbackUrl);

            const shotRegex = /<li[^>]*class=["'][^"']*shot-thumbnail[^"']*["'][^>]*>[\s\S]*?<a[^>]*href=["'](\/shots\/\d+[^"']*)["'][^>]*>[\s\S]*?<img[^>]*(?:src|data-src)=["']([^"']+)["'][^>]*(?:alt=["']([^"']+)["'])?/gi;
            let match;
            let count = 0;

            while ((match = shotRegex.exec(html)) !== null && count < perPage) {
                // Tenta pegar imagem em alta (substitui thumbnail por URL original se for o caso do Dribbble)
                let imgUrl = match[2];
                imgUrl = imgUrl.replace(/\?resize=\d+x\d+/, ''); // Limpa resizes

                results.push({
                    id: `ref_dribble_${page}_${count}`,
                    provider: 'Dribbble',
                    pageUrl: `https://dribbble.com${match[1]}`,
                    ogTitle: match[3] ? match[3].trim() : 'Shot Dribbble',
                    ogImage: imgUrl
                });
                count++;
            }

            if (count === 0 && page === 1) {
                results.push({ id: 'ref_dribbble_search', provider: 'Dribbble', pageUrl: fallbackUrl, ogTitle: `Ver resultados no Dribbble`, ogImage: null });
            }
        } catch (e) {
            console.warn('Dribbble scrape falhou:', e.message);
            if (page === 1) results.push({ id: 'ref_dribbble_fail', provider: 'Dribbble', pageUrl: fallbackUrl, ogTitle: `Ver resultados no Dribbble`, ogImage: null });
        }
    }

    // ============================================================
    // 4) BEHANCE
    // ============================================================
    async function scrapeBehance() {
        const offset = (page - 1) * 48; // Behance paginacao usa offset
        const fallbackUrl = `https://www.behance.net/search/projects?search=${encodedQuery}&offset=${offset}`;
        try {
            const html = await fetchHTML(fallbackUrl);

            const projectRegex = /<a[^>]*href=["'](https?:\/\/www\.behance\.net\/gallery\/\d+\/[^"']+)["'][^>]*>[\s\S]*?<img[^>]*src=["'](https:\/\/mir-s3-cdn-cf\.behance\.net\/project_modules\/[^"']+)["'][^>]*alt=["']([^"']+)["']/gi;
            let match;
            let count = 0;
            const seen = new Set();

            while ((match = projectRegex.exec(html)) !== null && count < perPage) {
                if (!seen.has(match[1])) {
                    seen.add(match[1]);
                    // Tenta forcar a imagem para disp/ ou max/ em vez de thumb/
                    const hqImg = match[2].replace(/\/disp\/\w+\//, '/disp/1200/');

                    results.push({
                        id: `ref_behance_${page}_${count}`,
                        provider: 'Behance',
                        pageUrl: match[1],
                        ogTitle: match[3],
                        ogImage: hqImg
                    });
                    count++;
                }
            }
            if (count === 0 && page === 1) {
                results.push({ id: 'ref_behance_search', provider: 'Behance', pageUrl: fallbackUrl, ogTitle: `Ver projetos no Behance`, ogImage: null });
            }
        } catch (e) {
            console.warn('Behance scrape falhou:', e.message);
            if (page === 1) results.push({ id: 'ref_behance_fail', provider: 'Behance', pageUrl: fallbackUrl, ogTitle: `Ver projetos no Behance`, ogImage: null });
        }
    }

    // ============================================================
    // 5) PINTEREST (Acesso mais profundo ao JSON inicial)
    // ============================================================
    async function scrapePinterest() {
        const fallbackUrl = `https://br.pinterest.com/search/pins/?q=${encodedQuery}`;
        try {
            // Pinterest usa bookmarks para paginacao, nao pages. Se for page>1 fica muito dificil sem token deles.
            // Para `page=1`, buscamos normal.
            const html = await fetchHTML(fallbackUrl);

            // Pinterest guarda TUDO no __INITIAL_STATE__ script
            const stateMatch = html.match(/<script[^>]*id=["']__PWS_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
            let count = 0;
            if (stateMatch) {
                const data = JSON.parse(stateMatch[1]);
                let pins = [];

                // Busca profunda por todos os objetos que parecem Pins
                const findPins = (obj) => {
                    if (!obj || typeof obj !== 'object') return;
                    if (obj.images && obj.images['474x'] && obj.id) {
                        pins.push(obj);
                    }
                    Object.values(obj).forEach(findPins);
                };
                findPins(data);

                // Pega imagem grande (474x ou original)
                pins = pins.slice(0, perPage);
                pins.forEach((pin, i) => {
                    const imgUrl = pin.images?.orig?.url || pin.images?.['474x']?.url;
                    const destUrl = pin.link || `https://br.pinterest.com/pin/${pin.id}/`;
                    if (imgUrl) {
                        results.push({
                            id: `ref_pinterest_${page}_${i}`,
                            provider: 'Pinterest',
                            pageUrl: destUrl,
                            ogTitle: pin.title || pin.description || 'Pin',
                            ogImage: imgUrl // Retorna a vertical completa!
                        });
                        count++;
                    }
                });
            }
            if (count === 0 && page === 1) {
                results.push({ id: 'ref_pinterest_search', provider: 'Pinterest', pageUrl: fallbackUrl, ogTitle: `Ver Pins no Pinterest`, ogImage: null });
            }
        } catch (e) {
            console.warn('Pinterest scrape falhou:', e.message);
            if (page === 1) results.push({ id: 'ref_pinterest_fail', provider: 'Pinterest', pageUrl: fallbackUrl, ogTitle: `Ver Pins no Pinterest`, ogImage: null });
        }
    }

    // ============================================================
    // 6) FREEPIK
    // ============================================================
    async function scrapeFreepik() {
        const fallbackUrl = `https://www.freepik.com/search?query=${encodedQuery}`;
        try {
            const html = await fetchHTML(fallbackUrl);

            const cardRegex = /<a[^>]*href=["'](https?:\/\/www\.freepik\.com\/free-(?:photo|vector|psd)\/[^"']+)["'][^>]*>[\s\S]*?<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']+)["']/gi;
            let match;
            let count = 0;
            const seen = new Set();

            while ((match = cardRegex.exec(html)) !== null && count < perPage) {
                if (!seen.has(match[1])) {
                    seen.add(match[1]);
                    results.push({
                        id: `ref_freepik_${page}_${count}`,
                        provider: 'Freepik',
                        pageUrl: match[1],
                        ogTitle: match[3],
                        ogImage: match[2]
                    });
                    count++;
                }
            }
            if (count === 0 && page === 1) {
                results.push({ id: 'ref_freepik_search', provider: 'Freepik', pageUrl: fallbackUrl, ogTitle: `Ver resultados no Freepik`, ogImage: null });
            }
        } catch (e) {
            console.warn('Freepik scrape falhou:', e.message);
            if (page === 1) results.push({ id: 'ref_freepik_fail', provider: 'Freepik', pageUrl: fallbackUrl, ogTitle: `Ver resultados no Freepik`, ogImage: null });
        }
    }

    // ============================================================
    // EXECUTAR TODAS
    // ============================================================
    try {
        await Promise.allSettled([
            scrapeDesignBR(),
            scrapeDesigni(),
            scrapeDribbble(),
            scrapeBehance(),
            scrapeFreepik(),
            // Pinterest só roda na página 1, pois paginação deles requer hash auth/bookmark local
            page === 1 ? scrapePinterest() : Promise.resolve()
        ]);

        // Misturar resultados
        const shuffled = results.sort(() => 0.5 - Math.random());

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                items: shuffled,
                page: page,
                hasMore: results.length >= 5
            })
        };

    } catch (error) {
        console.error("Erro geral search-references:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Falha geral." }) };
    }
};
