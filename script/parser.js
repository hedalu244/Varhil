"use strict";
//トークン単位に分割し、必要な情報を付加する
function tokenize(input, option, dictionary) {
    const literals = input.split(option.separator).filter(x => x !== "");
    const keyMapper = [];
    const tokens = literals.map((literal, index) => {
        if (option.openNegation.test(literal))
            return {
                literal, index, tokenType: "open_negation",
                gloss: "{NEG"
            };
        if (option.closeNegation.test(literal))
            return {
                literal, index, tokenType: "close_negation",
                gloss: "}NEG"
            };
        if (option.singleNegation.test(literal))
            return {
                literal, index, tokenType: "single_negation",
                gloss: "/NEG"
            };
        if (option.isolatedDeterminer.test(literal))
            return {
                literal, index, tokenType: "isolated_determiner",
                gloss: "DET"
            };
        if (option.newDeterminer.test(literal)) {
            const key = literal.replace(option.newDeterminer, option.keyOfNewDeterminer);
            const n = keyMapper.indexOf(key);
            const m = (n === -1) ? (keyMapper.push(key), keyMapper.length - 1) : n;
            return {
                literal, index, tokenType: "new_determiner",
                gloss: "DET" + m + "+",
                key: literal.replace(option.newDeterminer, option.keyOfNewDeterminer)
            };
        }
        if (option.inheritDeterminer.test(literal)) {
            const key = literal.replace(option.inheritDeterminer, option.keyOfInheritDeterminer);
            const n = keyMapper.indexOf(key);
            const m = (n === -1) ? (keyMapper.push(key), keyMapper.length - 1) : n;
            return {
                literal, index, tokenType: "inherit_determiner",
                gloss: "DET" + m,
                key: literal.replace(option.inheritDeterminer, option.keyOfInheritDeterminer),
            };
        }
        if (option.preposition.test(literal)) {
            const key = literal.replace(option.preposition, option.casusOfPreposition);
            const casus = dictionary.casus[key] || key;
            return {
                literal, index, tokenType: "preposition",
                gloss: "//PRE" + casus, casus: casus,
            };
        }
        if (option.relative.test(literal)) {
            const key = literal.replace(option.relative, option.casusOfRelative);
            const casus = dictionary.casus[key] || key;
            return {
                literal, index, tokenType: "relative",
                gloss: "//REL" + casus, casus: casus,
            };
        }
        if (option.predicate.test(literal)) {
            return {
                literal, index, tokenType: "predicate",
                gloss: dictionary.predicate[literal] || literal,
                name: dictionary.predicate[literal] || literal,
            };
        }
        throw new Error("TokenizeError: word " + literal + " can't be classificated");
    });
    return tokens;
}
// ポーランド記法を解く
function parse(tokens) {
    const phrases = [];
    while (tokens.length !== 0) {
        phrases.push(recursion(tokens));
    }
    return phrases;
    function recursion(tokens) {
        const token = tokens.shift();
        if (token === undefined)
            throw new Error("ParseError: Unxpected End of Tokens");
        if (token.tokenType == "close_negation")
            throw new Error("ParseError: Unxpected Token " + token.literal);
        switch (token.tokenType) {
            case "open_negation": {
                const children = [];
                while (true) {
                    const next = tokens.shift();
                    if (next === undefined)
                        throw new Error("ParseError: Unxpected End of Tokens");
                    if (next.tokenType === "close_negation")
                        return { phraseType: "negation", children, token: token, closeToken: next };
                    tokens.unshift(next);
                    children.push(recursion(tokens));
                }
            }
            case "single_negation":
                return { phraseType: token.tokenType, child: recursion(tokens), token: token };
            case "isolated_determiner":
                return { phraseType: token.tokenType, token: token };
            case "new_determiner":
                return { phraseType: token.tokenType, token: token, key: token.key };
            case "inherit_determiner":
                return { phraseType: token.tokenType, token: token, key: token.key };
            case "relative": {
                const left = recursion(tokens);
                const right = recursion(tokens);
                return { phraseType: token.tokenType, casus: token.casus, left, right, token: token };
            }
            case "preposition": {
                const left = recursion(tokens);
                const right = recursion(tokens);
                return { phraseType: token.tokenType, casus: token.casus, left, right, token: token };
            }
            case "predicate":
                return { phraseType: token.tokenType, name: token.name, token: token };
        }
    }
}
function T() {
    return { formulaType: "true" };
}
function F() {
    return { formulaType: "false" };
}
function negation(formula) {
    return { formulaType: "negation", formula };
}
function exist(variable, formula) {
    return { formulaType: "exist", variable, formula };
}
function all(variable, formula) {
    return { formulaType: "all", variable, formula };
}
function conjunction(formulas) {
    formulas = formulas.reduce((acc, cur) => {
        if (cur.formulaType === "true")
            return acc;
        if (cur.formulaType === "conjunction")
            acc.push(...cur.formulas);
        else
            acc.push(cur);
        return acc;
    }, []);
    if (formulas.length == 0)
        return T();
    if (formulas.length == 1)
        return formulas[0];
    return {
        formulaType: "conjunction",
        formulas
    };
}
function disjunction(formulas) {
    formulas = formulas.reduce((acc, cur) => {
        if (cur.formulaType == "false")
            return acc;
        if (cur.formulaType == "disjunction")
            acc.push(...cur.formulas);
        else
            acc.push(cur);
        return acc;
    }, []);
    if (formulas.length == 0)
        return F();
    if (formulas.length == 1)
        return formulas[0];
    return {
        formulaType: "disjunction",
        formulas
    };
}
function PredicateFormula(name, args) {
    return {
        formulaType: "predicate",
        name,
        args
    };
}
;
function interpret(phrases) {
    const variableMap = [[]];
    let variableCount = 0;
    function issueVariable() {
        const id = variableCount++;
        return {
            id,
            getName: () => {
                if (variableCount <= 3)
                    return ["x", "y", "z"][id];
                if (variableCount <= 26)
                    return ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"][id];
                return "x_" + id;
            }
        };
    }
    function findVariable(key) {
        const a = variableMap.find(closure => closure.some(entry => entry.key === key));
        const b = a === undefined ? undefined : a.find(entry => entry.key === key);
        return b === undefined ? undefined : b.variable;
        //return variableMap.map(map=>map.get(key)).find((x):x is Variable=>x !== undefined);
    }
    function isNounPartialMeaning(phrase) { return phrase.mainVariable !== undefined; }
    function isPredicatePartialMeaning(phrase) { return phrase.mainPredicate !== undefined; }
    function convertToNoun(a) {
        if (isNounPartialMeaning(a))
            return a;
        if (!isPredicatePartialMeaning(a))
            throw new Error("CalcError: Unexpected PartialMeaning");
        return interpretRelative("", a, interpretIsolatedDeterminer());
    }
    function interpretSentence(phrases) {
        const v = variableMap.shift();
        if (v === undefined)
            throw new Error();
        const variables = v.map(entry => entry.variable);
        return {
            formula: variables.reduce((f, v) => exist(v, f), conjunction(phrases.map(x => x.formula))),
            mainPredicate: undefined,
            mainVariable: undefined
        };
    }
    function interpretNegation(phrases) {
        return {
            formula: negation(interpretSentence(phrases).formula),
            mainPredicate: undefined,
            mainVariable: undefined
        };
    }
    function interpretSingleNegation(phrase) {
        const v = variableMap.shift();
        if (v === undefined)
            throw new Error();
        const variables = v.map(entry => entry.variable);
        return {
            formula: negation(variables.reduce((f, v) => exist(v, f), phrase.formula)),
            mainPredicate: phrase.mainPredicate,
            mainVariable: phrase.mainVariable
        };
    }
    function interpretIsolatedDeterminer() {
        const variable = issueVariable();
        variableMap[0].unshift({ key: null, variable });
        return {
            formula: T(),
            mainPredicate: undefined,
            mainVariable: variable
        };
    }
    function interpretNewDeterminer(key) {
        const variable = issueVariable();
        variableMap[0].unshift({ key, variable });
        return {
            formula: T(),
            mainPredicate: undefined,
            mainVariable: variable
        };
    }
    function interpretInheritDeterminer(key) {
        const variable = findVariable(key);
        if (variable === undefined) {
            console.warn();
            return interpretNewDeterminer(key);
        }
        return {
            formula: T(),
            mainPredicate: undefined,
            mainVariable: variable
        };
    }
    function interpretPreposition(casus, a, b) {
        const aa = convertToNoun(a);
        if (!isPredicatePartialMeaning(b))
            throw new Error("CalcError: Unexpected Phrase");
        b.mainPredicate.args.unshift({ casus: casus, variable: aa.mainVariable });
        return {
            formula: conjunction([aa.formula, b.formula]),
            mainPredicate: b.mainPredicate,
            mainVariable: undefined
        };
    }
    function interpretRelative(casus, a, b) {
        if (!isPredicatePartialMeaning(a))
            throw new Error("CalcError: Unexpected Phrase");
        const bb = convertToNoun(b);
        a.mainPredicate.args.unshift({ casus: casus, variable: bb.mainVariable });
        return {
            formula: conjunction([a.formula, bb.formula]),
            mainPredicate: undefined,
            mainVariable: bb.mainVariable
        };
    }
    function interpretPredicate(name) {
        const predicate = PredicateFormula(name, []);
        return {
            formula: predicate,
            mainPredicate: predicate,
            mainVariable: undefined
        };
    }
    function recursion(phrase) {
        // 否定はクロージャを生成
        switch (phrase.phraseType) {
            case "negation":
            case "single_negation":
                variableMap.unshift([]);
        }
        switch (phrase.phraseType) {
            case "negation": return interpretNegation(phrase.children.map(x => recursion(x)));
            case "single_negation": return interpretSingleNegation(recursion(phrase.child));
            case "isolated_determiner": return interpretIsolatedDeterminer();
            case "new_determiner": return interpretNewDeterminer(phrase.key);
            case "inherit_determiner": return interpretInheritDeterminer(phrase.key);
            case "preposition": return interpretPreposition(phrase.casus, recursion(phrase.left), recursion(phrase.right));
            case "relative": return interpretRelative(phrase.casus, recursion(phrase.left), recursion(phrase.right));
            case "predicate": return interpretPredicate(phrase.name);
        }
    }
    const result = interpretSentence(phrases.map(x => recursion(x)));
    return result.formula;
}
//標準化
function normalize(formula) {
    if (formula.formulaType === "negation") {
        const f = normalize(formula.formula);
        //￢￢φ → φ
        if (f.formulaType === "negation")
            return f.formula;
        //￢∃x;φ → ∀x;￢φ
        if (f.formulaType === "exist")
            return all(f.variable, normalize(negation(f.formula)));
        //￢∀x;φ → ∃x;￢φ
        if (f.formulaType === "all")
            return exist(f.variable, normalize(negation(f.formula)));
        //￢(φ∧ψ∧...) → (￢φ∨￢ψ∨...)
        if (f.formulaType === "conjunction")
            return normalize(disjunction(f.formulas.map(x => normalize(negation(x)))));
        //￢(φ∧ψ∧...) → (￢φ∨￢ψ∨...)
        if (f.formulaType === "disjunction")
            return normalize(conjunction(f.formulas.map(x => normalize(negation(x)))));
        return negation(f);
    }
    if (formula.formulaType === "exist")
        return exist(formula.variable, normalize(formula.formula));
    if (formula.formulaType === "all")
        return all(formula.variable, normalize(formula.formula));
    if (formula.formulaType === "conjunction") {
        let fs = formula.formulas.map(x => normalize(x));
        const q = [];
        //それぞれの項から量化を剥ぐ
        fs = fs.map(x => {
            while (true) {
                if (x.formulaType === "exist") {
                    q.unshift({ type: exist, variable: x.variable });
                    x = x.formula;
                }
                else if (x.formulaType === "all") {
                    q.unshift({ type: all, variable: x.variable });
                    x = x.formula;
                }
                else
                    break;
            }
            return x;
        });
        const formula2 = fs.reduce((acc, cur) => {
            if (cur.formulaType === "conjunction" && acc.formulaType === "conjunction")
                return conjunction([acc, cur]);
            if (cur.formulaType === "disjunction" && acc.formulaType === "conjunction")
                return disjunction(cur.formulas.map(x => conjunction([acc, x])));
            if (cur.formulaType === "conjunction" && acc.formulaType === "disjunction")
                return disjunction(acc.formulas.map(x => conjunction([cur, x])));
            if (cur.formulaType === "disjunction" && acc.formulaType === "disjunction")
                return disjunction(cur.formulas.map(x => disjunction(acc.formulas.map(y => conjunction([x, y])))));
            return conjunction([acc, cur]);
        }, T());
        //剥いだ量化を被せる
        return q.reduce((acc, cur) => cur.type(cur.variable, acc), formula2);
    }
    if (formula.formulaType === "disjunction") {
        let fs = formula.formulas.map(x => normalize(x));
        const q = [];
        //それぞれの項から量化を剥ぐ
        fs = fs.map(x => {
            while (true) {
                if (x.formulaType === "exist") {
                    q.unshift({ type: exist, variable: x.variable });
                    x = x.formula;
                }
                else if (x.formulaType === "all") {
                    q.unshift({ type: all, variable: x.variable });
                    x = x.formula;
                }
                else
                    break;
            }
            return x;
        });
        const formula2 = fs.reduce((acc, cur) => {
            return disjunction([acc, cur]);
        }, F());
        //剥いだ量化を被せる
        return q.reduce((acc, cur) => cur.type(cur.variable, acc), formula2);
    }
    return formula;
}
