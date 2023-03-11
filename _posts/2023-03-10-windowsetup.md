---
title: 내가 보려고 만든, Window에서 tensorflow 개발환경 구축하기 (cuda, cudnn 까지)
date: 2023-03-10
categories: [Setup, Window]
tags : [Made_for_me, Window, setup]
toc: True
---

이번 내용은 개발환경을 구축을 메뉴얼할 때 제가 보려고 만들었습니다.

내용은  [노마드코더](https://nomadcoders.co/) 의 window 셋업 강의를 보고 정리하였습니다.

이후 tensorflow, cuda, cudnn은 [영상](https://www.youtube.com/watch?v=hHWkvEcDBO0)을 참고하였습니다.

이 window setup은 window 10을 기준으로 만들었고, 그 이전 버전에는 호환되지 않습니다.





# 1. 기본 setup



## vscode 

일단 vscode를 다운합니다. 체크박스는 전부 체크한 다음 다운을 진행하면 됩니다.



그 이후 vscode extension에서 몇 가지를 다운로드해 줍니다.

1.  python
2.  Material  Theme
3.  Material Icon Theme 



## chocolatey 다운로드

chocolatey 는 리눅스와 Mac과 같이 CLI 에서 무언갈 다운받고 하는데 효과적입니다. (예: 크롬, 7-zip, java 등등 거의 모든 것)

1. [Installing Chocolatey](https://chocolatey.org/install) 에 들어가 줍니다.

2. Powershell 을 관리자 권한으로 켜줍니다.

3. 설치 명령어를 복사해서 붙여줍니다. 지금(2023-03-10)은 아래의 명령어 입니다.

   ```powershell
   > Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
   ```

4. Powershell을 종료하고 다시 관리자 권한으로 켜준뒤 명령어로 몇가지를 다운해 줍니다.

   * choco install adobereader
   * choco install vcredist2015 ( Microsoft Visual C++ Redistributable for Visual Studio 2015 Update 3 )
   * choco install git
   * choco install winrar
   * choco install python ( 가장 최신버전이 다운됩니다. 특정 버전을 다운하려면  python38 처럼 입력 ) 
   * choco install microsoft-windows-terminal 

   

   

# 2. WSL 

## setup

 터미널을 관리자 권한으로 켜줍니다.

1. 최신버전
   * wsl --install 을 입력합니다

2. 구버전 (최신버전이 안될 때)

   * 터미널에 아래 명령어를 입력합니다.

     ```powershell
     dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
     ```

   * 터미널에 `wsl --set-default-version 2` 를 입력합니다. ( 여기서 업데이트가 필요하면 wsl 2 커널을 다운로드 )

     

3. Microsoft store 에서 ubuntu 20.04 를 다운해줍니다.

4. ubuntu 를 열어주고 잠깐 기다린 뒤, 새로운 os 의 아이디, 비밀번호를 설정합니다.



## terminal customized

1. 터미널의 설정을 들어간뒤 json 파일을 열어줍니다.

   * "defaultProfile" 부분의 값을 우분투의 id 값으로 바꿔줍니다. (아래의 list 에서 다른 설정을 바꿔도 됩니다.)

   * "startingDirectory": "%USERPROFILE%" 을 아래 줄에 추가합니다.

2. Ubuntu 콘솔에서 `sudo apt install zsh`를 입력하여 zsh 를 다운로드합니다.

3. Ubuntu 콘솔에서 아래 명령어를 입력합니다.

   ```ubuntu
   sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
   ```

4.  Ubuntu 콘솔에서 아래 명령어를 입력합니다.

    ```ubuntu
    git clone --depth=1 https://github.com/romkatv/powerlevel10k.git ${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/themes/powerlevel10k
    ```

5. Ubuntu 콘솔에서 `code ~/.zshrc`를 입력해준 뒤 
   * ZSH_THEME="powerlevel10k/powerlevel10k" 을 수정해줍니다.
   * LS_COLORS="ow=01;36;40" && export LS_COLORS 을 가장 아래줄에 추가해줍니다.

6.  글꼴 MesloLGS NF Regular, Bold, Bold Italic, Italic 을 다운 받아줍니다.

7.  아래 줄들을 추가해줍니다.

    "colorScheme": "vscode"는 개인취향으로 terminal splash 에서 마음에 드는 색을 고르면 됩니다.

    ```Ubuntu
            "defaults": 
            {
                "colorScheme": "vscode", 
                "font": 
                {
                    "face": "MesloLGS NF"
                }
    ```

    ```Ubuntu
        "schemes": 
        [
            {
                "name": "vscode",
                "background" : "#232323",
                "black" : "#000000",
                "blue" : "#579BD5",
                "brightBlack" : "#797979",
                "brightBlue" : "#9BDBFE",
                "brightCyan" : "#2BC4E2",
                "brightGreen" : "#1AD69C",
                "brightPurple" : "#DF89DD",
                "brightRed" : "#F6645D",
                "brightWhite" : "#EAEAEA",
                "brightYellow" : "#F6F353",
                "cyan" : "#00B6D6",
                "foreground" : "#D3D3D3",
                "green" : "#3FC48A",
                "purple" : "#CA5BC8",
                "red" : "#D8473F",
                "white" : "#EAEAEA",
                "yellow" : "#D7BA7D"
            },
    ```

    

8. Ubuntu를 재시작 한뒤 옵션들을 쭉 진행해줍니다.
   *  특히 Instant prompt 설정에서 3번

   *  apply change to ~/.zshrc? - yes

   *  만약 다시 설정하고 싶다면 `p10k configure` 를 입력하면 재설정 할 수 있습니다.

      
   
9.  vscode 에서 **terminal.integrated.default profile** 를 검색해서 **WSL** 로 기본 프롬프트를 바꿔줍니다. 




## other setting

1.  `sudo add-apt-repository ppa:deadsnakes/ppa` 를 입력합니다.
2.  vscode 에서 WSL: Ubuntu 를 설정해줍니다.

![image-20230312002310166](C:\Users\rh987\OneDrive\document\GitHub\komingsu.github.io\images\2023-03-10-windowsetup\image-20230312002310166.png){}

3. vscode extention, Prettier 를 다운해줍니다.
4. setting 에서 Editor.Format on save 부분을 체크해줍니다. (window, WSL 둘 다)
5. [Releases · cli/cli (github.com)](https://github.com/cli/cli/releases) 에서 .deb 파일을 다운받아 줍니다 - (amd or arm).
6. 다운받은 폴더에서 `sudo apt install ./{다운받은 파일 이름}` 을 입력합니다.
7. `git config --global user.name "깃헙이름"`, `git config --global user.email "깃헙 이메일"` 를 입력합니다.
8.  `gh auth login` 을 한 뒤 잘 따라가서 gh cli 와 연동함
9. `gh config set editor "code --wait"`





# 3. tensorflow



1. `wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh ` 입력

2. `bash Miniconda3-latest-Linux-x86_64.sh` 입력

3. `conda update -n base conda` 입력

4. `conda install -c conda-forge cudatoolkit=11.2 cudnn=8.1.0` 입력

5. `export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$CONDA_PREFIX/lib/ `입력

6. `conda create -n 가상환경이름 python=버전` 입력

7. `conda source activate myenv ` 가상환경 사용

8. `python3 -m pip install tensorflow`

   
