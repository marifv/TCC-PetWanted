const RAIO_AGRUPAMENTO_PIXELS = 56;

function projetarCoordenada(animal, regiao, dimensoes) {
    return {
        x: ((Number(animal.local_longitude) - regiao.longitude) / regiao.longitudeDelta) * dimensoes.width,
        y: ((Number(animal.local_latitude) - regiao.latitude) / regiao.latitudeDelta) * dimensoes.height,
    };
}

export function agruparMarcadores(animais, regiao, dimensoes) {
    if (
        !regiao
        || !dimensoes?.width
        || !dimensoes?.height
        || !regiao.latitudeDelta
        || !regiao.longitudeDelta
    ) {
        return animais.map((animal) => ({
            id: `${animal.tipo_registro}-${animal.id}`,
            animais: [animal],
            latitude: Number(animal.local_latitude),
            longitude: Number(animal.local_longitude),
        }));
    }

    const pontos = animais.map((animal) => ({
        animal,
        ...projetarCoordenada(animal, regiao, dimensoes),
    }));
    const pais = pontos.map((_ponto, indice) => indice);
    const encontrarRaiz = (indice) => {
        let raiz = indice;
        while (pais[raiz] !== raiz) raiz = pais[raiz];
        while (pais[indice] !== indice) {
            const proximo = pais[indice];
            pais[indice] = raiz;
            indice = proximo;
        }
        return raiz;
    };
    const unirGrupos = (primeiro, segundo) => {
        const raizPrimeiro = encontrarRaiz(primeiro);
        const raizSegundo = encontrarRaiz(segundo);
        if (raizPrimeiro !== raizSegundo) pais[raizSegundo] = raizPrimeiro;
    };
    const celulas = new Map();

    pontos.forEach((ponto, indice) => {
        const celulaX = Math.floor(ponto.x / RAIO_AGRUPAMENTO_PIXELS);
        const celulaY = Math.floor(ponto.y / RAIO_AGRUPAMENTO_PIXELS);

        for (let deslocamentoX = -1; deslocamentoX <= 1; deslocamentoX += 1) {
            for (let deslocamentoY = -1; deslocamentoY <= 1; deslocamentoY += 1) {
                const vizinhos = celulas.get(`${celulaX + deslocamentoX}:${celulaY + deslocamentoY}`) || [];
                vizinhos.forEach((indiceVizinho) => {
                    const vizinho = pontos[indiceVizinho];
                    if (Math.hypot(ponto.x - vizinho.x, ponto.y - vizinho.y) <= RAIO_AGRUPAMENTO_PIXELS) {
                        unirGrupos(indice, indiceVizinho);
                    }
                });
            }
        }

        const chaveCelula = `${celulaX}:${celulaY}`;
        celulas.set(chaveCelula, [...(celulas.get(chaveCelula) || []), indice]);
    });

    const gruposPorRaiz = new Map();
    pontos.forEach((ponto, indice) => {
        const raiz = encontrarRaiz(indice);
        if (!gruposPorRaiz.has(raiz)) gruposPorRaiz.set(raiz, []);
        gruposPorRaiz.get(raiz).push(ponto.animal);
    });

    return [...gruposPorRaiz.values()].map((animaisDoGrupo) => {
        const identificadores = animaisDoGrupo
            .map((animal) => `${animal.tipo_registro}-${animal.id}`)
            .sort();
        return {
            id: identificadores.join('|'),
            animais: animaisDoGrupo,
            latitude: animaisDoGrupo.reduce((soma, animal) => soma + Number(animal.local_latitude), 0) / animaisDoGrupo.length,
            longitude: animaisDoGrupo.reduce((soma, animal) => soma + Number(animal.local_longitude), 0) / animaisDoGrupo.length,
        };
    });
}
