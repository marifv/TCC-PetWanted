import { agruparMarcadores } from './agruparMarcadores';

const regiao = {
    latitude: 0,
    longitude: 0,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
};
const dimensoes = { width: 400, height: 800 };

function animal(id, latitude, longitude) {
    return {
        id,
        tipo_registro: 'Perdido',
        local_latitude: latitude,
        local_longitude: longitude,
    };
}

describe('agruparMarcadores', () => {
    it('agrupa marcadores próximos sem mesclar os registros', () => {
        const primeiro = animal(1, 0, 0);
        const segundo = animal(2, 0.0005, 0.0005);
        const terceiro = animal(3, 0.0015, 0.0005);

        const grupos = agruparMarcadores([primeiro, segundo, terceiro], regiao, dimensoes);

        expect(grupos).toHaveLength(1);
        expect(grupos[0].animais).toEqual([primeiro, segundo, terceiro]);
        expect(grupos[0].id).toBe('Perdido-1|Perdido-2|Perdido-3');
    });

    it('mantém marcadores distantes em grupos individuais', () => {
        const animais = [animal(1, 0, 0), animal(2, 0.01, 0.01)];

        const grupos = agruparMarcadores(animais, regiao, dimensoes);

        expect(grupos).toHaveLength(2);
        expect(grupos.map((grupo) => grupo.animais[0])).toEqual(animais);
    });

    it('não agrupa marcadores até que as dimensões do mapa estejam disponíveis', () => {
        const animais = [animal(1, 0, 0), animal(2, 0.0005, 0.0005)];

        const grupos = agruparMarcadores(animais, regiao, { width: 0, height: 0 });

        expect(grupos).toHaveLength(2);
    });
});
