---
title: 함수형 정규표현식, VerbalExpressions
date: 2023-03-04
categories: [Python]
tags : [Python]
toc: True
comments: True
---

<head>

  <style>

  table.dataframe {

   white-space: normal;

   width: 100%;

   height: 240px;

   display: block;

   overflow: auto;

   font-family: Arial, sans-serif;

   font-size: 0.9rem;

   line-height: 20px;

   text-align: center;

   border: 0px !important;

  }

  table.dataframe th {

   text-align: center;

   font-weight: bold;

   padding: 8px;

  }

  table.dataframe td {

   text-align: center;

   padding: 8px;

  }

  table.dataframe tr:hover {

   background: #b8d1f3; 

  }

  .output_prompt {

   overflow: auto;

   font-size: 0.9rem;

   line-height: 1.45;

   border-radius: 0.3rem;

   -webkit-overflow-scrolling: touch;

   padding: 0.8rem;

   margin-top: 0;

   margin-bottom: 15px;

   font: 1rem Consolas, "Liberation Mono", Menlo, Courier, monospace;

   color: $code-text-color;

   border: solid 1px $border-color;

   border-radius: 0.3rem;

   word-break: normal;

   white-space: pre;

  }

 .dataframe tbody tr th:only-of-type {

   vertical-align: middle;

 }

 .dataframe tbody tr th {

   vertical-align: top;

 }

 .dataframe thead th {

   text-align: center !important;

   padding: 8px;

 }

 .page__content p {

   margin: 0 0 0px !important;

 }

 .page__content p > strong {

  font-size: 0.8rem !important;

 }

 </style>

</head>

​	정규표현식, Regular Expression 간단히는 정규식, Regex 라고 하는 것은특정한 규칙을 가진 문자열의 집합을 표현하는 데 사용하는 형식 언어입니다.



긴 문장 혹은 여러 문장에서 특징을 혹은 규칙을 제시하여 문자, 문장을 찾아내거나 수정하는데 사용합니다.



여기서 정규표현식은 자주 사용하지 않다보니 한 번 공부를 했어도 사용할 때 마다 검색을 하게 되는것 같습니다.



그래서 찾게된 함수형 정규표현식 `VerbalExpressions`



## 라이브러리 다운로드

```Python
!pip install VerbalExpressions
```


## 사용예시

​	URL을 읽어오는 정규표현식을 만들어보겠습니다.

```python
from verbalexpressions import VerEx

ve = VerEx()
tester = (ve.
            start_of_line().
            find('http').
            maybe('s').
            find('://').
            maybe('www.').
            anything_but(' ').
            end_of_line()
)
```

​	테스트 URL도 만들구요

```python
test_url = "https://www.google.com"

if tester.match(test_url):
    print("Valid URL")
```

<pre>
Valid URL
</pre>

​	어떤 정규표현식이 만들어진 것인지 확인해보기.

```python
print(tester.source())
```

<pre>
^(http)(s)?(://)(www\.)?([^\ ]*)$
</pre>



​	이번에는 단어를 찾고 바꾸는 예제를 보겠습니다.

```python
replace_ex = "Replace bird with a duck"

ve = VerEx().find('bird')
result_ve = ve.replace(replace_ex, 'duck')
print(result_ve)
```

<pre>
Replace duck with a duck
</pre>

​	

## 사용법

​	전화번호의 형태 010-0000-0000 인지 확인하는 사용예제를 만들면서 사용법을 확인해보겠습니다.

### 1. VerbalExpression 객체 생성

```python
from verbalexpressions import VerEx

ve = VerEx()

re1 = ve
```

객체를 먼저 생성하고 정규표현식을 작성하기 시작합니다.



### 2. start_of_line(), end_of_line()

​	식의 처음과 끝에는 항상 들어가야합니다

```python
re1 = (ve.
      start_of_line().
      
      
      end_of_line()
)
```

​	정규표현식의 "^"  , "$" 와 같습니다.

### 3. fine(value), then(value)

​	반드시 들어가야하는 표현을 적습니다.

​	010이 반드시 들어갈 필요는 없지만 가정해보겠습니다.

```python
re1 = (ve.
      start_of_line().
      fine("010").
      end_of_line()
)
```

​	정규표현식의 "(%s)?" 와 같습니다. 

### 4. maybe(value)

​	들어갈 수도 있는 표현을 적습니다.

전화번호에서 ( - )하이푼을 안적는 사람을 가정하겠습니다.

```python
re1 = (ve.
      start_of_line().
      fine("010").
      maybe("-").
      end_of_line()
)
```

​	정규표현식의 "(%s)?%value" 와 같습니다

### 5. range(value, value)

​	연속된 범위를 찾는 표현을 적습니다.

```python
re2 = (ve.
       start_of_line().
       find("010").
       maybe("-").
       range('0','9').
       range('0','9').
       range('0','9').
       range('0','9').
       maybe("-").
       range('0','9').
       range('0','9').
       range('0','9').
       range('0','9').
       end_of_line()
)
```

 물론 a-z 까지 이렇게도 가능합니다.

 현재 자파스크립트에는 반복 함수가 있는데 python에는 반복함수가 없습니다.. 5년전부터 업데이트를 멈췄네요. 나중에 full request 걸어 봐야겠습니다.

​	

### 6. source(), raw(), value()

​	모두 같은 기능을 합니다. 정규표현식을 문자열로 return 합니다.

```python
print(re1.source())
```

<pre>
^(010)(\-)?([0-9])([0-9])([0-9])([0-9])(\-)?([0-9])([0-9])([0-9])([0-9])$ 
</pre>



```python
test_number = "010-1234-5678"

if re1.match(test_number):
    print("valid")
```

<pre>
valid
</pre>

잘 나오는 것을 볼 수 있습니다.



### 7. regex(), compile()

 정규표현식의 compile() 과 같습니다.

```python
re1.compile()
```

<pre>
re.compile(r'^(010)(\-)?([0-9])([0-9])([0-9])([0-9])(\-)?([0-9])([0-9])([0-9])([0-9])$', re.UNICODE)
</pre>

정규표현식의 객체로 받을 수 있습니다.



### 8. anything()

​	와일드카드(*) 문자입니다. 어떤것이 와도 가능합니다.

```python
re3 = (ve.
       start_of_line().
       anything().
       find("@").
       end_of_line()
)
```

​	정규표현식의 "(.*)" 과 같습니다.

### 9. anything_but(value)

​	특정 표현외에 모든것이 와도 가능한 표현에 사용합니다.

```python
re3 = (ve.
       start_of_line().
       anything().
       find("@").
       anything_but(" ").
       end_of_line()
)
```

​	정규표현식의 "( [ ^%s ]* )" 와 같습니다.



### 10. line_break()

​	줄 바꿈을 표현합니다.

​	정규표현식의 "(\n | \r\n)" 와 같습니다.



### 11. tab()

​	`\t`, `tab` 이 쓰였는지 표현합니다.

​	정규표현식의 "\t" 와 같습니다.



### 12. word()

​	단어가 있는지 표현합니다.

​	정규표현식의 "\w+" 와 같습니다.



### 13. OR()

​	기존의 정규표현식에서 OR을 대체합니다.

​	정규표현식의 "|" 를 표현합니다.



### 끝으로



VerbalExpressions 에서 특정 줄에서, 특정 케이스에서 찾고, 바꾸는 방법이 있지만 표현식의 작성만 간단하게 하고 다른 부분은 re를 이용해서 사용하는것이 좋아보인다.

