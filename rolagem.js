// ==========================
// CALCULADORA DE ROLAGEM
// ==========================
// Compara o custo de fechar a posição atual com o prémio da nova
// posição, e mostra se a rolagem é feita por crédito ou débito,
// além do retorno % e anualizado sobre o strike novo.

function calcularRolagem() {

    const custoFechar = parseFloat(document.getElementById('rolCustoFechar').value);
    const premioNovo = parseFloat(document.getElementById('rolPremioNovo').value);
    const strikeNovo = parseFloat(document.getElementById('rolStrikeNovo').value);
    const dias = parseFloat(document.getElementById('rolDias').value);

    const resultado = document.getElementById('rolResultado');
    const resultadoLabel = document.getElementById('rolResultadoLabel');
    const resultadoAnualizado = document.getElementById('rolResultadoAnualizado');

    if (isNaN(custoFechar) || isNaN(premioNovo)) {
        resultado.textContent = '—';
        resultado.style.color = '#67e8f9';
        resultadoLabel.textContent = '';
        resultadoAnualizado.textContent = '';
        return;
    }

    const liquido = premioNovo - custoFechar;

    // Formata sempre com sinal (+ ou -) e 2 casas decimais
    const sinal = liquido >= 0 ? '+' : '';
    resultado.textContent = `${sinal}$${liquido.toFixed(2)}`;

    if (liquido > 0) {
        resultado.style.color = '#34d399';
        resultadoLabel.textContent = '✅ Rolagem por CRÉDITO líquido';
    } else if (liquido < 0) {
        resultado.style.color = '#f87171';
        resultadoLabel.textContent = '⚠️ Rolagem por DÉBITO líquido';
    } else {
        resultado.style.color = '#67e8f9';
        resultadoLabel.textContent = 'Rolagem neutra (sem custo nem crédito)';
    }

    // Retorno % sobre o strike novo (se strike e dias preenchidos)
    if (!isNaN(strikeNovo) && strikeNovo > 0) {

        const retornoPct = (liquido / strikeNovo) * 100;

        if (!isNaN(dias) && dias > 0) {

            const anualizado = (retornoPct / dias) * 365;

            resultadoAnualizado.textContent =
                `Retorno: ${retornoPct.toFixed(2)}% sobre o strike · Anualizado: ${anualizado.toFixed(1)}%`;

        } else {

            resultadoAnualizado.textContent =
                `Retorno: ${retornoPct.toFixed(2)}% sobre o strike`;

        }

    } else {
        resultadoAnualizado.textContent = '';
    }

}
